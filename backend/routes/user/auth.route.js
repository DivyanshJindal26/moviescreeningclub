const express = require('express')
const rateLimit = require('express-rate-limit')
const { signup, login, update } = require('@/controllers/user/auth.controller')
const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/login', authLimiter, login)
router.post('/update', update)
router.post('/signup', authLimiter, signup)
module.exports = router
