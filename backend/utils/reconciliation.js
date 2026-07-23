// Background reconciliation for membership payments.
//
// Runs every 2 minutes and processes any PendingTransaction that is:
//   - status = PENDING
//   - createdAt > 2 minutes ago (gives the returnUrl redirect a chance to land)
//
// For each such transaction it calls Atom's transaction status API and:
//   - SUCCESS  → atomically marks COMPLETED, issues membership, emails user
//   - FAILED   → marks FAILED, emails user
//   - AMBIGUOUS / network error → increments attempt count, leaves PENDING
//   - PENDING  > 15 min → marks MANUAL_REVIEW, no further automatic processing
//
// Idempotency: the PENDING → COMPLETED transition uses findOneAndUpdate with
// a { status: 'PENDING' } filter. If it returns null the returnUrl handler or
// a concurrent reconciliation run already handled it — we skip issuance.

require('module-alias/register')
const Queue = require('bull')
const PendingTransaction = require('@/models/pendingTransaction.model')
const User = require('@/models/user/user.model')
const { queryAtomTransactionStatus } = require('@/utils/payment')
const { issueMembership } = require('@/controllers/user/memberships.controller')
const { membershipFailureMail } = require('@/utils/mail')

const RECONCILE_INTERVAL_MS = 2 * 60 * 1000   // 2 minutes
const PENDING_GRACE_MS = 2 * 60 * 1000         // ignore transactions < 2 min old
const MANUAL_REVIEW_THRESHOLD_MS = 15 * 60 * 1000 // flag after 15 min

const reconciliationQueue = new Queue('membership-reconciliation')

reconciliationQueue.process('reconcile-pending', async (job) => {
  const now = Date.now()
  const gracePoint = new Date(now - PENDING_GRACE_MS)
  const reviewPoint = new Date(now - MANUAL_REVIEW_THRESHOLD_MS)

  const pendingTxns = await PendingTransaction.find({
    status: 'PENDING',
    createdAt: { $lte: gracePoint }
  })

  if (pendingTxns.length === 0) return

  console.log(`[reconciliation] processing ${pendingTxns.length} pending transaction(s)`)

  for (const txn of pendingTxns) {
    const label = `txn ${txn.merchTxnId}`
    try {
      // Flag for manual review if the transaction is older than 15 minutes
      // and still unresolved — stop retrying automatically.
      if (txn.createdAt <= reviewPoint) {
        const flagged = await PendingTransaction.findOneAndUpdate(
          { _id: txn._id, status: 'PENDING' },
          {
            $set: {
              status: 'MANUAL_REVIEW',
              lastReconciliationAt: new Date()
            },
            $inc: { reconciliationAttempts: 1 }
          },
          { new: false }
        )
        if (flagged) {
          console.warn(`[reconciliation] ${label} flagged for MANUAL_REVIEW after ${Math.round((now - txn.createdAt) / 60000)} min`)
        }
        continue
      }

      const txnDate = txn.createdAt
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')

      let atomStatus
      try {
        atomStatus = await queryAtomTransactionStatus(
          txn.merchTxnId,
          txn.amount,
          txnDate
        )
      } catch (apiErr) {
        // Network / decryption error — log and leave PENDING for next cycle
        console.error(`[reconciliation] ${label} status API threw:`, apiErr.message)
        await PendingTransaction.findByIdAndUpdate(txn._id, {
          $inc: { reconciliationAttempts: 1 },
          $set: { lastReconciliationAt: new Date() }
        })
        continue
      }

      console.log(`[reconciliation] ${label} Atom response:`, {
        f_code: atomStatus.f_code,
        mmp_txn: atomStatus.mmp_txn,
        attempts: txn.reconciliationAttempts + 1
      })

      if (atomStatus.f_code === 'Ok') {
        // Atomically claim the transaction. If another process (e.g. the user
        // finally hitting the returnUrl) already claimed it, claimed === null
        // and we skip issuance to prevent duplicates.
        const claimed = await PendingTransaction.findOneAndUpdate(
          { _id: txn._id, status: 'PENDING' },
          {
            $set: {
              status: 'COMPLETED',
              atomTxnId: atomStatus.mmp_txn,
              rawAtomResponse: atomStatus,
              lastReconciliationAt: new Date()
            },
            $inc: { reconciliationAttempts: 1 }
          },
          { new: false }
        )

        if (!claimed) {
          console.log(`[reconciliation] ${label} already claimed by returnUrl handler, skipping`)
          continue
        }

        const user = await User.findById(txn.userId)
        if (!user) {
          console.error(`[reconciliation] ${label} user ${txn.userId} not found — membership not issued`)
          continue
        }

        await issueMembership({
          userId: txn.userId,
          memtype: txn.memtype,
          txnId: txn.merchTxnId,
          amount: txn.amount,
          email: user.email
        })
        console.log(`[reconciliation] ${label} COMPLETED — membership issued for ${user.email}`)

      } else if (atomStatus.error) {
        // Status API returned an error (network, parse, etc.) — leave PENDING
        console.warn(`[reconciliation] ${label} status API error:`, atomStatus.error)
        await PendingTransaction.findByIdAndUpdate(txn._id, {
          $inc: { reconciliationAttempts: 1 },
          $set: {
            rawAtomResponse: atomStatus,
            lastReconciliationAt: new Date()
          }
        })

      } else {
        // Atom confirmed the payment is not successful
        const failed = await PendingTransaction.findOneAndUpdate(
          { _id: txn._id, status: 'PENDING' },
          {
            $set: {
              status: 'FAILED',
              rawAtomResponse: atomStatus,
              lastReconciliationAt: new Date()
            },
            $inc: { reconciliationAttempts: 1 }
          },
          { new: false }
        )

        if (failed) {
          const user = await User.findById(txn.userId)
          if (user) {
            membershipFailureMail(user.email).catch((e) =>
              console.error(`[reconciliation] ${label} failure mail error:`, e.message)
            )
          }
          console.log(`[reconciliation] ${label} FAILED — notified ${user?.email}`)
        }
      }
    } catch (err) {
      console.error(`[reconciliation] unexpected error for ${label}:`, err.message)
      // Bump the attempt counter so we don't silently stall
      await PendingTransaction.findByIdAndUpdate(txn._id, {
        $inc: { reconciliationAttempts: 1 },
        $set: { lastReconciliationAt: new Date() }
      }).catch(() => {})
    }
  }
})

reconciliationQueue.on('failed', (job, err) => {
  console.error('[reconciliation] job failed:', err.message)
})

// Schedule the repeating job. Bull deduplicates repeatable jobs by
// (name + every), so this is safe to call on every server restart.
reconciliationQueue
  .add('reconcile-pending', {}, {
    repeat: { every: RECONCILE_INTERVAL_MS },
    removeOnComplete: 20,
    removeOnFail: 10
  })
  .then(() => {
    console.log('[reconciliation] queue started — polling every 2 minutes')
  })
  .catch((err) => {
    console.error('[reconciliation] failed to schedule job:', err.message)
  })

module.exports = reconciliationQueue
