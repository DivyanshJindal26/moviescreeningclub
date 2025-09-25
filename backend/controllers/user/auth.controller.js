// controllers/authController.js
const bcrypt = require('bcrypt')
const User = require('@/models/user/user.model')
const OTP = require('@/models/user/otp.model')
const jwt = require('jsonwebtoken')
const { getUserType } = require('@/utils/user')
const signup = async (req, res) => {
  try {
    const { name, phone, designation, password, otp, email } = req.body
    // Check if all details are provided
    if (!name || !email || !password || !otp || !phone) {
      return res.status(403).json({
        success: false,
        message: 'All fields are required'
      })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      })
    }

    const response = await OTP.find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(1)
    if (response.length === 0 || otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: 'The OTP is not valid'
      })
    }
    // Secure password
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Hashing password error for ${password}: ` + error.message
      })
    }
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      designation: getUserType(email) || 'other'
    })
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: newUser
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        usertype: user.usertype || 'standard',
        name: user.name || 'user',
        phone: user.phone || ''
      },
      `${process.env.JWT_SECRET || 'secret'}`,
      {
        expiresIn: '24h'
      }
    )
    res.cookie('token', token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    })
    res.status(200).json({
      userId: user._id,
      email: user.email,
      usertype: user.usertype || 'standard',
      name: user.name || 'user',
      phone: user.phone || '',
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
    })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const update = async (req, res) => {
  try {
    const { email, password, otp } = req.body
    console.log(req.body)
    if (!email || !password || !otp) {
      console.log('input error')
      return res.status(403).json({
        success: false,
        message: 'All fields are required'
      })
    }
    const response = await OTP.find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(1)

    if (response.length === 0 || otp !== response[0].otp) {
      console.log('otp error')
      return res.status(400).json({
        success: false,
        message: 'The OTP is not valid'
      })
    }
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
    } catch (error) {
      console.log('password error')
      return res.status(500).json({
        success: false,
        message: `Hashing password error for ${password}: ` + error.message
      })
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      console.log('user error')
      return res.status(404).json({ error: 'User not found' })
    }
    user.password = hashedPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const onSpotUserCreation = async(req, res) => {
  try {
    const { email} = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    let user = await User.findOne({ email });
    if (!user) {
      const newUser = new User({
        email,
        name: 'OnSpotBooking',
        phone: 9999999999,
        password: await bcrypt.hash('iitmandi', 10),
        designation: getUserType(email) || 'other'
      });
      
      try {
        user = await newUser.save();
        console.log(`Created new user account for: ${email}`);
      } catch (error) {
        console.error('Error creating new user:', error);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
    }
    
    const userId = user._id;
    return res.status(200).json({ 
      success: true, 
      userId,
      email: user.email,
      designation: user.designation,
      name: user.name || 'user',
      phone: user.phone || '',
      message: 'User account processed successfully' 
    });
  } catch (error) {
    console.error('Error in onSpotUserCreation:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during user processing' 
    });
  }
}


module.exports = { signup, login, update, onSpotUserCreation }
