const otpGenerator = require('otp-generator')
const OTP = require('@/models/user/otp.model')
const User = require('@/models/user/user.model')
const { mailOtp } = require('@/utils/mail')

const userOTP = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })
    if (user) {
      return res.status(401).json({ error: 'User already exists please login' })
    }
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    })

    await OTP.create({ email: email.toLowerCase(), otp })

    await mailOtp(otp, email.toLowerCase())
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again later.'
    })
  }
}

const sendOTPforgot = async (req, res) => {
  try {
    const { email } = req.body

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    })

    await OTP.create({ email: email.toLowerCase(), otp })

    await mailOtp(otp, email.toLowerCase(), 'Password Reset')
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again later.'
    })
  }
}

module.exports = { userOTP, sendOTPforgot }
