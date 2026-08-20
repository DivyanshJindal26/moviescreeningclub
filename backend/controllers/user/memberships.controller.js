const Membership = require('@/models/membership.model')
const PendingTransaction = require('@/models/pendingTransaction.model')
const User = require('@/models/user/user.model')
const MemPrice = require('@/models/membershipprice.model')
const crypto = require('crypto')
const { membershipMail, membershipFailureMail } = require('@/utils/mail')
const { getAmount } = require('@/utils/membership')
const {
  getAtomFromGateway,
  decrypt,
  generateSignature,
  queryAtomTransactionStatus
} = require('@/utils/payment')
require('dotenv').config()

// ---------------------------------------------------------------------------
// Shared helper: create membership record + send confirmation email.
// Called by both the returnUrl handler and the background reconciliation job.
//
// Idempotency is enforced by the caller: the PendingTransaction must be
// atomically transitioned from PENDING → COMPLETED before calling this.
// If that transition fails (already done), the caller must skip this call.
// ---------------------------------------------------------------------------
const issueMembership = async ({ userId, memtype, txnId, amount, email }) => {
  const anyMems = await Membership.find({ user: userId, isValid: true })
  for (const anyMem of anyMems) {
    let shouldInvalidate = false
    if (anyMem.validitydate < Date.now()) {
      shouldInvalidate = true
    } else if (anyMem.memtype === 'filmFest') {
      shouldInvalidate =
        (anyMem.moviesUsed || []).length >= (anyMem.movieCount || 0)
    } else {
      shouldInvalidate = anyMem.availQR <= 0
    }

    if (shouldInvalidate) {
      anyMem.isValid = false
      if (anyMem.memtype !== 'filmFest') anyMem.availQR = 0
      await anyMem.save()
    } else {
      // User already has a valid membership — this can happen if they bought
      // twice in rapid succession. Skip issuance; money will need manual review.
      console.warn(
        `[issueMembership] user ${userId} already has active membership, skipping issuance for txn ${txnId}`
      )
      return { skipped: true }
    }
  }

  const memData = await MemPrice.find()
  const memDetails = memData.find(
    (m) => m.name === memtype || m.passType === memtype
  )
  if (!memDetails) throw new Error(`Unknown memtype: ${memtype}`)

  const { validity, availQR, passType, movieCount } = memDetails
  const membershipData = {
    user: userId,
    memtype,
    txnId,
    validity,
    availQR,
    amount,
    validitydate: new Date(Date.now() + validity * 1000)
  }
  if (passType === 'filmFest') {
    membershipData.movieCount = movieCount
    membershipData.moviesUsed = []
  }

  const membership = new Membership(membershipData)
  await membership.save()
  try {
    await membershipMail(memtype, email.toLowerCase())
  } catch (mailError) {
    console.error(`[issueMembership] membership saved but email failed for txn ${txnId}:`, mailError.message)
  }
  console.log(`[issueMembership] issued ${memtype} membership for txn ${txnId}`)
  return { membership }
}

const getMembershipPrices = async (req, res) => {
  try {
    const membershipPrices = await MemPrice.find()
    return res.status(200).json(membershipPrices)
  } catch (error) {
    console.error('Error fetching membership prices:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const setMembershipPrice = async (req, res) => {
  try {
    const { name, price, validity, availQR, passType, movieCount } = req.body

    const updateData = { price, validity, availQR }

    // Add Film Fest Pass specific fields
    if (passType) {
      updateData.passType = passType
    }
    if (movieCount) {
      updateData.movieCount = movieCount
    }

    const updatedMembership = await MemPrice.findOneAndUpdate(
      { name },
      updateData,
      { new: true, upsert: true }
    )

    return res.status(200).json(updatedMembership)
  } catch (error) {
    console.error('Error updating membership price:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/membership/redirect — Atom's returnUrl handler.
//
// Strategy: decrypt the redirect payload to get the txnId, then ALWAYS
// confirm via queryAtomTransactionStatus() before issuing anything.
// We never trust the redirect payload alone — it can be dropped, replayed,
// or tampered with. The status API is ground truth.
//
// Idempotency: we atomically transition PendingTransaction PENDING → COMPLETED
// using findOneAndUpdate with a PENDING filter. If the transition returns null,
// a parallel process (another redirect hit or the reconciliation job) already
// handled it — we skip issuance and redirect to success.
const saveMembership = async (req, res) => {
  let txnId
  try {
    // Step 1: Decrypt redirect payload to identify the transaction.
    // If decryption fails we can't identify the txn — surface an error.
    let jsonData
    try {
      jsonData = JSON.parse(decrypt(req.body.encData))
    } catch (decryptErr) {
      console.error('[saveMembership] failed to decrypt encData:', decryptErr.message)
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=decrypt_failed`)
    }

    txnId = jsonData.payInstrument?.merchDetails?.merchTxnId
    if (!txnId) {
      console.error('[saveMembership] no txnId in decrypted payload')
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=missing_txn_id`)
    }

    // Step 2: Signature check — log mismatches but do NOT bail out yet.
    // We still call the status API because the payment may be legitimate even
    // if the redirect payload was somehow corrupted in transit.
    const signature = generateSignature(jsonData.payInstrument)
    if (signature !== jsonData.payInstrument?.payDetails?.signature) {
      console.warn(`[saveMembership] signature mismatch for txn ${txnId} — will still confirm via status API`)
    }

    // Step 3: Check if we've already handled this transaction (idempotent re-hits).
    const existingTxn = await PendingTransaction.findOne({ merchTxnId: txnId })
    if (!existingTxn) {
      // This shouldn't happen in normal flow — log and error out.
      console.error(`[saveMembership] no PendingTransaction found for txnId ${txnId}`)
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=unknown_transaction`)
    }
    if (existingTxn.status === 'COMPLETED') {
      return res.redirect(`${process.env.FRONTEND_URL}/home?success_payment=true`)
    }
    if (existingTxn.status === 'FAILED') {
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=transaction_failed`)
    }
    if (existingTxn.status === 'MANUAL_REVIEW') {
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=payment_under_review`)
    }

    // Step 4: Confirm with Atom's status API (server-to-server).
    const txnDate = existingTxn.createdAt
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '')

    let atomStatus
    try {
      atomStatus = await queryAtomTransactionStatus(
        txnId,
        existingTxn.amount,
        txnDate
      )
    } catch (statusErr) {
      // Network or decryption error — keep PENDING, reconciliation job will retry.
      console.error(`[saveMembership] status API error for txn ${txnId}:`, statusErr.message)
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=payment_confirming`)
    }

    console.log(`[saveMembership] Atom status for txn ${txnId}:`, atomStatus)

    if (atomStatus.f_code === 'Ok') {
      // Step 5a: Atomically claim the transaction — prevents duplicate issuance
      // if the reconciliation job fires at the exact same moment.
      const claimed = await PendingTransaction.findOneAndUpdate(
        { merchTxnId: txnId, status: 'PENDING' },
        {
          $set: {
            status: 'COMPLETED',
            atomTxnId: atomStatus.mmp_txn,
            rawAtomResponse: atomStatus,
            lastReconciliationAt: new Date()
          },
          $inc: { reconciliationAttempts: 1 }
        },
        { new: false } // return the OLD document — null means already processed
      )

      if (!claimed) {
        // Another process beat us to it — membership already issued.
        console.log(`[saveMembership] txn ${txnId} already claimed, skipping duplicate issuance`)
        return res.redirect(`${process.env.FRONTEND_URL}/home?success_payment=true`)
      }

      const user = await User.findById(existingTxn.userId)
      await issueMembership({
        userId: existingTxn.userId,
        memtype: existingTxn.memtype,
        txnId,
        amount: existingTxn.amount,
        email: user.email
      })
      return res.redirect(`${process.env.FRONTEND_URL}/home?success_payment=true`)

    } else if (atomStatus.error) {
      // Status API itself errored (network/encryption issue) — keep PENDING.
      console.warn(`[saveMembership] status API returned error for txn ${txnId}:`, atomStatus.error)
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=payment_confirming`)

    } else {
      // Atom confirmed payment failed or is unambiguously not Ok.
      await PendingTransaction.findOneAndUpdate(
        { merchTxnId: txnId, status: 'PENDING' },
        {
          $set: {
            status: 'FAILED',
            rawAtomResponse: atomStatus,
            lastReconciliationAt: new Date()
          },
          $inc: { reconciliationAttempts: 1 }
        }
      )
      const user = await User.findById(existingTxn.userId)
      if (user) {
        membershipFailureMail(user.email).catch((e) =>
          console.error('[saveMembership] failure mail error:', e.message)
        )
      }
      return res.redirect(`${process.env.FRONTEND_URL}/home?err=transaction_failed`)
    }
  } catch (error) {
    console.error(`[saveMembership] unexpected error for txn ${txnId}:`, error)
    // Do NOT mark as FAILED on unexpected errors — keep PENDING for reconciliation.
    return res.redirect(`${process.env.FRONTEND_URL}/home?err=internal_server_error`)
  }
}

const manualAdd = async (req, res) => {
  try {
    const { userEmail, txnId, membershipType, amount, passes } = req.body

    const user = await User.findOne({ email: userEmail.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const memData = await MemPrice.find()
    const memDetails = memData.find((m) => m.name === membershipType)
    if (!memDetails) {
      return res.status(400).json({ error: 'Invalid membership type' })
    }

    const { validity, availQR, passType, movieCount } = memDetails

    const parsedPasses =
      passes !== undefined && passes !== '' && !Number.isNaN(Number(passes))
        ? Number(passes)
        : availQR

    const parsedAmount = Number(amount)
    if (Number.isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Map membership name to enum value
    const memtypeMapping = {
      base: 'base',
      silver: 'silver',
      gold: 'gold',
      diamond: 'diamond',
      'Film Fest': 'filmFest',
      'Foodie Film Fest': 'filmFest'
    }

    const memtype =
      memtypeMapping[membershipType] ||
      membershipType.toLowerCase().replace(/\s+/g, '')

    const membershipData = {
      user: user._id,
      memtype,
      txnId,
      validity,
      availQR: parsedPasses,
      amount: parsedAmount,
      validitydate: new Date(Date.now() + validity * 1000)
    }

    // Add Film Fest Pass specific fields
    if (passType === 'filmFest') {
      membershipData.movieCount = parsedPasses
      membershipData.moviesUsed = []
    }

    const newMembership = new Membership(membershipData)

    await newMembership.save()
    try {
      await membershipMail(membershipType, userEmail.toLowerCase())
    } catch (mailError) {
      console.error('Membership saved, email failed:', mailError)
    }

    res
      .status(201)
      .json({ success: true, message: 'Membership added successfully' })
  } catch (error) {
    console.error('Error in manualAdd:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const assignBaseMembership = async (req, res) => {
  try {
    const memData = await MemPrice.find()
    const coreTeamUsers = await User.find({ usertype: 'ticketvolunteer' })
    const baseMembership = memData.find((m) => m.name === 'base')

    if (!baseMembership) {
      return res.status(400).json({ message: 'Base membership not found' })
    }

    const { validity, availQR } = baseMembership

    const newMemberships = await Promise.all(
      coreTeamUsers.map(async (user) => ({
        user: user._id,
        memtype: 'base',
        txnId: 'coreteam',
        validity,
        availQR,
        amount: await getAmount('base', user.email),
        validitydate: new Date(Date.now() + validity * 1000)
      }))
    )

    await Membership.insertMany(newMemberships)

    return res.status(200).json({
      message: 'Base membership assigned successfully to all core team users'
    })
  } catch (error) {
    console.error('Error assigning base membership:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const requestMembership = async (req, res) => {
  try {
    const { userId } = req.user
    const { memtype } = req.body
    const memData = await MemPrice.find()
    const validMem = memData.find(
      (m) => m.name === memtype || m.passType === memtype
    )
    if (!memtype || !validMem) {
      return res.status(400).json({ message: 'Membership type is required' })
    }
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const userMemberships = await Membership.find({
      user: user._id,
      isValid: true
    })
    for (const mem of userMemberships) {
      let hasValidPasses = false
      if (mem.memtype === 'filmFest') {
        const moviesUsed = mem.moviesUsed || []
        const movieCount = mem.movieCount || 0
        hasValidPasses =
          mem.validitydate > Date.now() && moviesUsed.length < movieCount
      } else {
        hasValidPasses = mem.validitydate > Date.now() && mem.availQR > 0
      }

      if (hasValidPasses) {
        return res
          .status(400)
          .json({ message: 'User already has a valid membership' })
      }
      mem.isValid = false
      if (mem.memtype !== 'filmFest') mem.availQR = 0
      await mem.save()
    }

    const txnId = crypto.randomBytes(16).toString('hex')
    const txnDate = new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '')
    const amount = await getAmount(memtype, user.email)

    // --- Save PENDING transaction BEFORE redirecting to Atom ---
    // If the user closes the tab mid-payment, the reconciliation job will
    // pick this up and query Atom's status API to settle it.
    await PendingTransaction.create({
      merchTxnId: txnId,
      userId: user._id,
      memtype,
      amount
    })
    console.log(`[requestMembership] saved PENDING txn ${txnId} for user ${userId}`)

    const { error, atomTokenId, merchId } = await getAtomFromGateway(
      txnId,
      txnDate,
      amount,
      user.email,
      user.phone,
      user._id.toString(),
      {
        udf1: memtype,
        udf2: user._id.toString(),
        udf3: '',
        udf4: '',
        udf5: ''
      }
    )
    if (error) {
      // Gateway rejected the request — mark FAILED immediately
      await PendingTransaction.findOneAndUpdate(
        { merchTxnId: txnId },
        { $set: { status: 'FAILED', rawAtomResponse: { error } } }
      )
      return res.status(500).json({ error })
    }

    return res.status(200).json({ atomTokenId, txnId, merchId })
  } catch (error) {
    console.error('Error requesting membership:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const checkMembership = async (req, res) => {
  try {
    const { userId } = req.user
    const allMemberships = await Membership.find({ user: userId })

    // Invalidate memberships based on their type
    const invalidMemberships = allMemberships.filter((m) => {
      // Check validity date for all memberships
      if (m.validitydate < Date.now()) return true

      // For Film Fest Pass, check if all movies are used
      if (m.memtype === 'filmFest') {
        const moviesUsed = m.moviesUsed || []
        const movieCount = m.movieCount || 0
        return moviesUsed.length >= movieCount
      }

      // For standard passes, check availQR
      return m.availQR <= 0
    })

    for (const m of invalidMemberships) {
      m.isValid = false
      if (m.memtype !== 'filmFest') {
        m.availQR = 0
      }
      await m.save()
    }

    return res.json({
      hasMembership: allMemberships.some((m) => m.isValid),
      memberships: allMemberships.map((m) => ({
        _id: m._id,
        memtype: m.memtype,
        validitydate: m.validitydate,
        availQR: m.availQR,
        isValid: m.isValid,
        purchasedate: m.purchasedate,
        movieCount: m.movieCount,
        moviesUsed: m.moviesUsed
      }))
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const suspendMembership = async (req, res) => {
  const { userId } = req.user
  const { id: membershipId } = req.params
  try {
    const userMemberships = await Membership.find({ user: userId })
    let membershipSuspended = false

    for (const membership of userMemberships) {
      let shouldSuspend = false

      // Check if membership should be suspended
      if (
        membership.validitydate < Date.now() ||
        membership._id.toString() === membershipId
      ) {
        shouldSuspend = true
      } else if (membership.memtype === 'filmFest') {
        const moviesUsed = membership.moviesUsed || []
        const movieCount = membership.movieCount || 0
        shouldSuspend = moviesUsed.length >= movieCount
      } else {
        shouldSuspend = membership.availQR <= 0
      }

      if (shouldSuspend) {
        membership.isValid = false
        if (membership.memtype !== 'filmFest') {
          membership.availQR = 0
        }
        await membership.save()
        membershipSuspended = true
      }
    }

    if (membershipSuspended) {
      res.status(200).send('Memberships suspended successfully')
    } else {
      res.status(404).send('No current memberships found for the user')
    }
  } catch (error) {
    console.error('Error suspending memberships:', error)
    res.status(500).send('Internal server error')
  }
}

const createMembership = async (req, res) => {
  try {
    const { name, price, validity, availQR, passType, movieCount } = req.body

    // Check if membership with this name already exists
    const existingMembership = await MemPrice.findOne({ name })
    if (existingMembership) {
      return res
        .status(400)
        .json({ message: 'Membership with this name already exists' })
    }

    const membershipData = {
      name,
      price,
      validity,
      availQR
    }

    // Add Film Fest Pass specific fields
    if (passType) {
      membershipData.passType = passType
    }
    if (movieCount) {
      membershipData.movieCount = movieCount
    }

    const newMembership = new MemPrice(membershipData)

    const savedMembership = await newMembership.save()
    return res.status(201).json(savedMembership)
  } catch (error) {
    console.error('Error creating membership:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  saveMembership,
  checkMembership,
  suspendMembership,
  requestMembership,
  assignBaseMembership,
  getMembershipPrices,
  setMembershipPrice,
  manualAdd,
  createMembership,
  issueMembership
}
