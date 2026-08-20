// Background reconciliation for membership payments.
//
// Runs every 5 minutes. Any PENDING transaction older than the grace period
// that wasn't resolved by the returnUrl redirect gets flagged MANUAL_REVIEW.
//
// The returnUrl handler (saveMembership) is the primary path for completing
// payments — it verifies the HMAC-signed redirect payload from Atom and
// issues memberships immediately. This job is a safety net for edge cases
// where the redirect never fires (user closes tab, network issue, etc.).

const PendingTransaction = require('@/models/pendingTransaction.model')

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000
const GRACE_MS = 15 * 60 * 1000

let running = false

async function reconcilePending() {
  if (running) return
  running = true
  try {
    const cutoff = new Date(Date.now() - GRACE_MS)

    const result = await PendingTransaction.updateMany(
      { status: 'PENDING', createdAt: { $lte: cutoff } },
      {
        $set: { status: 'MANUAL_REVIEW', lastReconciliationAt: new Date() },
        $inc: { reconciliationAttempts: 1 }
      }
    )

    if (result.modifiedCount > 0) {
      console.log(`[reconciliation] flagged ${result.modifiedCount} stale PENDING txn(s) for MANUAL_REVIEW`)
    }
  } catch (err) {
    console.error('[reconciliation] job failed:', err.message)
  } finally {
    running = false
  }
}

setInterval(reconcilePending, RECONCILE_INTERVAL_MS)
console.log('[reconciliation] started — polling every 5 minutes')

module.exports = { reconcilePending }
