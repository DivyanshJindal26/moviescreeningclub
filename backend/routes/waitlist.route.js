const express = require('express')
const router = express.Router()
const { verifyJWTWithRole } = require('@/middleware')
const {
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
  getWaitlistCount,
  adminGetWaitlist
} = require('@/controllers/waitlist.controller')

router.post('/join/:showtimeId', verifyJWTWithRole('standard'), joinWaitlist)
router.delete('/leave/:showtimeId', verifyJWTWithRole('standard'), leaveWaitlist)
router.get('/status/:showtimeId', verifyJWTWithRole('standard'), getWaitlistStatus)
router.get('/count/:showtimeId', getWaitlistCount)
router.get('/admin/:showtimeId', verifyJWTWithRole('admin'), adminGetWaitlist)

module.exports = router
