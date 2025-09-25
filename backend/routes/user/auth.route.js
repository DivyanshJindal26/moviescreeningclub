// routes/authRoutes.js
const express = require('express')
const { signup, login, update, onSpotUserCreation } = require('@/controllers/user/auth.controller')
const router = express.Router()

router.post('/login', login)
router.post('/update', update)
router.post('/signup', signup)
router.post('/onspot', onSpotUserCreation)
module.exports = router
