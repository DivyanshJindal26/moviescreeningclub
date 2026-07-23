const express = require('express')
const rateLimit = require('express-rate-limit')
const { userOTP, sendOTPforgot } = require('@/controllers/user/otp.controller')
const router = express.Router()

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/user', otpLimiter, userOTP)
router.post('/forgot', otpLimiter, sendOTPforgot)
module.exports = router
