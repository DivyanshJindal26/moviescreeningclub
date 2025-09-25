const express = require('express')
const router = express.Router()
const {
  fetchUsers,
  updateUserType,
  userType,
  userMembershipData
} = require('@/controllers/user/user.controller')
const { verifyJWTWithRole } = require('@/middleware')

router.get('/fetchusers', verifyJWTWithRole('admin'), fetchUsers)
router.post('/updateUserType', verifyJWTWithRole('admin'), updateUserType)
router.get('/:email', verifyJWTWithRole(), userType)
router.get('/membershipdata/:email', verifyJWTWithRole(), userMembershipData)
module.exports = router
