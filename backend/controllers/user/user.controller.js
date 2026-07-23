const User = require('@/models/user/user.model')
const MemPrice = require('@/models/membershipprice.model')
const Membership = require('@/models/membership.model')
const QR = require('@/models/qr.model')
const Order = require('@/models/food/order.model')

const fetchUsers = async (req, res) => {
  try {
    let query = {}

    // Check if role filter is provided in query parameters
    if (req.query.role) {
      // If role filter is provided, construct the query to filter users by role
      query = { usertype: req.query.role }
    }

    // Fetch users based on the constructed query
    const users = await User.find(query)

    res.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

const updateUserType = async (req, res) => {
  try {
    const { email, userType } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.usertype = userType
    await user.save()

    res.status(200).json({ message: 'User type updated successfully', user })
  } catch (error) {
    console.error('Error updating user type:', error)
    res.status(500).json({ error: 'Error updating user type' })
  }
}

const userType = async (req, res) => {
  try {
    const { email } = req.user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(200).json({
      userType: user.usertype,
      userName: user.name,
      userPhone: user.phone
    })
  } catch (error) {
    console.error('Error fetching user type:', error)
    res.status(500).json({ error: 'Error fetching user type' })
  }
}

const userMembershipData = async (req, res) => {
  try {
    const email = req.params.email
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const membershipPrices = await MemPrice.find()
    const userPrices = membershipPrices.map((membership) => {
      const price = membership.price.find(
        (price) => price.type === user.designation
      )
      const passes = membership.passType === 'filmFest'
        ? membership.movieCount || membership.availQR
        : membership.availQR
      return {
        membershipName: membership.name,
        price: price ? price.price : null,
        passes
      }
    })
    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        designation: user.designation,
        usertype: user.usertype
      },
      userPrices
    })
  } catch (error) {
    console.error('Error fetching user membership data:', error)
    res.status(500).json({ error: 'Error fetching user membership data' })
  }
}

const getUserDetails = async (req, res) => {
  try {
    const { email } = req.params
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '-password'
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Fetch memberships
    const memberships = await Membership.find({ user: user._id })
      .sort({ purchasedate: -1 })
      .lean()

    // Fetch QR codes
    const qrCodes = await QR.find({ user: user._id })
      .populate('showtime')
      .sort({ createdAt: -1 })
      .lean()

    // Fetch food orders
    const orders = await Order.find({ user: user._id })
      .populate('items.item')
      .sort({ createdAt: -1 })
      .lean()

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        designation: user.designation,
        usertype: user.usertype
      },
      memberships,
      qrCodes,
      orders
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    res.status(500).json({ error: 'Error fetching user details' })
  }
}

const updateUserDetails = async (req, res) => {
  try {
    const { email } = req.params
    const { name, phone, designation, usertype, newEmail } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if email is being changed and if new email already exists
    if (newEmail && newEmail.toLowerCase() !== email.toLowerCase()) {
      const existingUser = await User.findOne({ email: newEmail.toLowerCase() })
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' })
      }
      user.email = newEmail.toLowerCase()
    }

    if (name) user.name = name
    if (phone) user.phone = phone
    if (designation) user.designation = designation
    if (usertype) user.usertype = usertype

    await user.save()

    res.status(200).json({
      message: 'User details updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        designation: user.designation,
        usertype: user.usertype
      }
    })
  } catch (error) {
    console.error('Error updating user details:', error)
    res.status(500).json({ error: 'Error updating user details' })
  }
}

const updateMembership = async (req, res) => {
  try {
    const { membershipId } = req.params
    const { isValid, amount, availQR } = req.body

    const membership = await Membership.findById(membershipId)

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' })
    }

    if (isValid !== undefined) membership.isValid = isValid
    if (amount !== undefined) membership.amount = amount
    if (availQR !== undefined) membership.availQR = availQR

    await membership.save()

    res.status(200).json({
      message: 'Membership updated successfully',
      membership
    })
  } catch (error) {
    console.error('Error updating membership:', error)
    res.status(500).json({ error: 'Error updating membership' })
  }
}

const updateQRCode = async (req, res) => {
  try {
    const { qrId } = req.params
    const { isValid, used, deleted } = req.body

    const qr = await QR.findById(qrId)

    if (!qr) {
      return res.status(404).json({ error: 'QR code not found' })
    }

    if (isValid !== undefined) qr.isValid = isValid
    if (used !== undefined) qr.used = used
    if (deleted !== undefined) qr.deleted = deleted

    await qr.save()

    res.status(200).json({
      message: 'QR code updated successfully',
      qr
    })
  } catch (error) {
    console.error('Error updating QR code:', error)
    res.status(500).json({ error: 'Error updating QR code' })
  }
}

const deleteMembership = async (req, res) => {
  try {
    const { membershipId } = req.params

    const membership = await Membership.findByIdAndDelete(membershipId)

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' })
    }

    res.status(200).json({
      message: 'Membership deleted successfully',
      deletedMembership: membership
    })
  } catch (error) {
    console.error('Error deleting membership:', error)
    res.status(500).json({ error: 'Error deleting membership' })
  }
}

const deleteQRCode = async (req, res) => {
  try {
    const { qrId } = req.params

    const qr = await QR.findByIdAndDelete(qrId)

    if (!qr) {
      return res.status(404).json({ error: 'QR code not found' })
    }

    res.status(200).json({
      message: 'QR code deleted successfully',
      deletedQR: qr
    })
  } catch (error) {
    console.error('Error deleting QR code:', error)
    res.status(500).json({ error: 'Error deleting QR code' })
  }
}

module.exports = {
  fetchUsers,
  updateUserType,
  userType,
  userMembershipData,
  getUserDetails,
  updateUserDetails,
  updateMembership,
  updateQRCode,
  deleteMembership,
  deleteQRCode
}
