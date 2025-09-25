const User = require('@/models/user/user.model')
const MemPrice = require('@/models/membershipprice.model')

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
    const membershipPrices = await MemPrice.find();
    const userPrices = membershipPrices.map((membership) => {
      const price = membership.price.find((price) => price.type === user.designation);
      return {
        membershipName: membership.name,
        price: price ? price.price : null
      };
    });
    res.status(200).json({ user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      designation: user.designation,
      usertype: user.usertype
    }, userPrices })
  }
  catch (error) {
    console.error('Error fetching user membership data:', error)
    res.status(500).json({ error: 'Error fetching user membership data' })
  }
}

module.exports = { fetchUsers, updateUserType, userType, userMembershipData }
