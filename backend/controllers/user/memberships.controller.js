const Membership = require('@/models/membership.model')
const User = require('@/models/user/user.model')
const MemPrice = require('@/models/membershipprice.model')
const crypto = require('crypto')
const { membershipMail } = require('@/utils/mail')
const { getAmount } = require('@/utils/membership')
const { getAtomFromGateway } = require('@/utils/payment')
const { getUserType } = require('@/utils/user')
require('dotenv').config()

const { decrypt, generateSignature } = require('@/utils/payment')

const getMembershipPrices = async (req, res) => {
  try {
    const membershipPrices = await MemPrice.find()
    console.log(req.user)
    return res.status(200).json(membershipPrices)
  } catch (error) {
    console.error('Error fetching membership prices:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getOnSpotCost = async (req, res) => {
  try {
    const { seats, userDesignation } = req.body
    const seatCount = seats.length
    let membershipType = 'base'
    if (seatCount === 2) {
      membershipType = 'silver'
    } else if (seatCount === 3) {
      membershipType = 'gold'
    } else if (seatCount >= 4) {
      membershipType = 'diamond'
    }
    const membership = await MemPrice.find({ name: membershipType })
    const selectedMembershipCost = await membership[0].price.find(
      (mem) => mem.type === userDesignation
    ).price
    if (!selectedMembershipCost) {
      return res.status(400).json({ message: 'Membership type not found' })
    }
    let totalCost = selectedMembershipCost
    if (seatCount > 4) {
      totalCost += (selectedMembershipCost * (seatCount - 4)) / 4
    }
    return res.status(200).json({ totalCost, memType: membershipType })
  } catch (error) {
    console.error('Error fetching on-spot cost:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const setMembershipPrice = async (req, res) => {
  try {
    const { name, price, validity, availQR } = req.body

    const updatedMembership = await MemPrice.findOneAndUpdate(
      { name },
      { price, validity, availQR },
      { new: true, upsert: true }
    )

    return res.status(200).json(updatedMembership)
  } catch (error) {
    console.error('Error updating membership price:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const manualAdd = async (req, res) => {
  try {
    const { userEmail, txnId, membershipType, amount } = req.body

    if (!/^[a-f0-9]{32}$/i.test(txnId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' })
    }

    const user = await User.findOne({ email: userEmail.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const memData = await MemPrice.find()
    const memDetails = memData.find((m) => m.name === membershipType)
    if (!memDetails) {
      return res.status(400).json({ error: 'Invalid membership type' })
    }

    const { validity, availQR } = memDetails
    const newMembership = new Membership({
      user: user._id,
      memtype: membershipType,
      txnId,
      validity,
      availQR,
      amount,
      validitydate: new Date(Date.now() + validity * 1000)
    })

    await newMembership.save()
    await membershipMail(membershipType, userEmail.toLowerCase())

    res
      .status(201)
      .json({ success: true, message: 'Membership added successfully' })
  } catch (error) {
    console.error('Error in manualAdd:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const saveMembership = async (req, res) => {
  try {
    const decrypted_data = decrypt(req.body.encData)
    const jsonData = JSON.parse(decrypted_data)
    const signature = generateSignature(jsonData.payInstrument)

    const { onspot, showtimeId, movieId, seats } = req.query

    if (signature !== jsonData.payInstrument.payDetails.signature) {
      console.log('signature mismatched!!')
      return res.redirect(
        `${process.env.FRONTEND_URL}/home?err=signature_mismatched${onspot === 'true' ? '&onspot=true' : ''}`
      )
    }

    if (jsonData.payInstrument.responseDetails.statusCode !== 'OTS0000') {
      return res.redirect(
        `${process.env.FRONTEND_URL}/home?err=transaction_failed${onspot === 'true' ? '&onspot=true' : ''}`
      )
    }

    const memtype = jsonData.payInstrument.extras.udf1
    const userId = jsonData.payInstrument.extras.udf2
    const email = jsonData.payInstrument.custDetails.custEmail.toLowerCase()
    const txnId = jsonData.payInstrument.merchDetails.merchTxnId

    // Invalidate old memberships if expired
    const anyMems = await Membership.find({ user: userId, isValid: true })
    for (const anyMem of anyMems) {
      if (anyMem.availQR <= 0 || anyMem.validitydate < Date.now()) {
        anyMem.isValid = false
        anyMem.availQR = 0
        await anyMem.save()
      } else {
        // Active membership exists, redirect home
        return res.redirect(`${process.env.FRONTEND_URL}/home`)
      }
    }

    const memData = await MemPrice.find()
    const memDetails = memData.find((m) => m.name === memtype)
    let { validity, availQR } = memDetails

    let isValid = true
    if (onspot && onspot === 'true') {
      availQR = 0
      isValid = false // OnSpot purchases do not consume membership passes
    }

    const newusermem = new Membership({
      user: userId,
      memtype,
      txnId,
      validity,
      isValid,
      availQR,
      amount: getAmount(memtype, email),
      validitydate: new Date(Date.now() + validity * 1000)
    })

    const savedusermem = await newusermem.save()
    console.log('Usermem details saved:', savedusermem)

    await membershipMail(memtype, email)

    // ===== OnSpot flow =====
    if (onspot && onspot === 'true' && seats && showtimeId) {
      const seatList = seats.split(',')
      await OnSpotTicket.updateMany(
        {
          user: userId,
          showtimeId,
          seats: { $in: seatList },
          status: 'locked'
        },
        { $set: { status: 'paid' } }
      )
      console.log(
        `OnSpot tickets for user ${email} marked as paid: ${seatList.join(', ')}`
      )
      return res.redirect(
        `${process.env.FRONTEND_URL}/onspot?showtimeId=${showtimeId}&movieId=${movieId}&success_payment=true&onspot=true`
      )
    }

    return res.redirect(`${process.env.FRONTEND_URL}/home?success_payment=true`)
  } catch (error) {
    console.error('Error saving Usermem:', error)
    return res.redirect(
      `${process.env.FRONTEND_URL}/home?err=internal_server_error${onspot === 'true' ? '&onspot=true' : ''}`
    )
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

    const newMemberships = coreTeamUsers.map((user) => ({
      user: user._id,
      memtype: 'base',
      txnId: 'coreteam',
      validity,
      availQR,
      amount: getAmount('base', user.email),
      validitydate: new Date(Date.now() + validity * 1000)
    }))

    await Membership.insertMany(newMemberships)

    return res.status(200).json({
      message: 'Base membership assigned successfully to all core team users'
    })
  } catch (error) {
    console.error('Error assigning base membership:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const requestOnSpotMembership = async (req, res) => {
  try {
    const { userId, email, seats, txnCost, memType } = req.body
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    const userMemberships = await Membership.find({
      user: user._id,
      isValid: true
    })
    for (const mem of userMemberships) {
      if (mem.validitydate.getTime() > Date.now() && mem.availQR > 0) {
        return res
          .status(400)
          .json({ message: 'User already has a valid membership' })
      }
      mem.isValid = false
      mem.availQR = 0
      await mem.save()
    }
    const txnId = crypto.randomBytes(16).toString('hex')
    const txnDate = new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '')
    const amount = txnCost
    console.log(user._id)
    const userEmailId = user.email
    const userContactNo = user.phone
    console.log('userContactNo', userContactNo)
    console.log('userEmailId', userEmailId)
    console.log('amount', amount)
    console.log('txnDate', txnDate)
    const { error, atomTokenId, merchId } = await getAtomFromGateway(
      txnId,
      txnDate,
      amount,
      userEmailId,
      userContactNo,
      user._id.toString(),
      {
        udf1: memType,
        udf2: user._id.toString(),
        udf3: '',
        udf4: '',
        udf5: ''
      }
    )
    if (error) {
      return res.status(500).json({ error })
    }
    return res.status(200).json({
      atomTokenId: atomTokenId,
      txnId: txnId,
      merchId: merchId
    })
  } catch (error) {
    console.error('Error requesting on-spot membership:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const requestMembership = async (req, res) => {
  try {
    const { userId } = req.user
    const { memtype } = req.body
    const memData = await MemPrice.find()
    if (!memtype || memData.map((m) => m.name).indexOf(memtype) === -1) {
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
    for (mem of userMemberships) {
      if (mem.validitydate > Date.now() && mem.availQR > 0) {
        return res
          .status(400)
          .json({ message: 'User already has a valid membership' })
      }
      mem.isValid = false
      mem.availQR = 0
      await mem.save()
    }

    const txnId = crypto.randomBytes(16).toString('hex')
    const txnDate = new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '')
    const amount = await getAmount(memtype, user.email)
    const userEmailId = user.email
    const userContactNo = user.phone

    const { error, atomTokenId, merchId } = await getAtomFromGateway(
      txnId,
      txnDate,
      amount,
      userEmailId,
      userContactNo,
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
      return res.status(500).json({ error })
    }
    return res.status(200).json({
      atomTokenId: atomTokenId,
      txnId: txnId,
      merchId: merchId
    })
  } catch (error) {
    console.error('Error requesting membership:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const checkMembership = async (req, res) => {
  try {
    const { userId } = req.user
    const allMemberships = await Membership.find({ user: userId })

    const invalidMemberships = allMemberships.filter(
      (m) => m.validitydate < Date.now() || m.availQR <= 0
    )
    for (m of invalidMemberships) {
      m.isValid = false
      m.availQR = 0
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
        purchasedate: m.purchasedate
      }))
    })
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const suspendMembership = async (req, res) => {
  const { userId } = req.user
  const { id: membershipId } = req.params
  try {
    const userMemberships = await Membership.find({ user: userId })
    const membershipSuspended = false

    for (membership of userMemberships) {
      if (
        membership.validitydate < Date.now() ||
        membership.availQR <= 0 ||
        membership._id === membershipId
      ) {
        membership.isValid = false
        membership.availQR = 0
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
    const { name, price, validity, availQR } = req.body

    // Check if membership with this name already exists
    const existingMembership = await MemPrice.findOne({ name })
    if (existingMembership) {
      return res
        .status(400)
        .json({ message: 'Membership with this name already exists' })
    }

    const newMembership = new MemPrice({
      name,
      price,
      validity,
      availQR
    })

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
  createMembership,
  getOnSpotCost,
  requestOnSpotMembership,
  manualAdd
}
