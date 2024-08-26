const express = require('express')
const router = express.Router()
const {
  seatOccupancy,
  seatAssign,
  freepasses,
  getMails
} = require('@/controllers/seatmap.controller')
const { verifyJWTWithRole } = require('@/middleware')

router.get('/:showtimeId', verifyJWTWithRole(), seatOccupancy)
router.put('/:showtimeId', verifyJWTWithRole(), seatAssign)
router.get('/freepasses/:showtimeId', verifyJWTWithRole(), freepasses)
router.get('/mail/:showtimeId', verifyJWTWithRole('admin'), getMails)
module.exports = router
