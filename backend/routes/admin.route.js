const express = require('express')
const router = express.Router()
const { verifyJWTWithRole } = require('@/middleware')
const PendingTransaction = require('@/models/pendingTransaction.model')
const User = require('@/models/user/user.model')
const { exportTickets, exportMemberships, exportRevenue } = require('@/controllers/export.controller')
const { getDashboardStats, getOccupancyByMovie, getRevenueTrend } = require('@/controllers/analytics.controller')

router.get('/export/tickets/:movieId', verifyJWTWithRole('admin'), exportTickets)
router.get('/export/memberships', verifyJWTWithRole('admin'), exportMemberships)
router.get('/export/revenue', verifyJWTWithRole('admin'), exportRevenue)

router.get('/analytics/dashboard', verifyJWTWithRole('admin'), getDashboardStats)
router.get('/analytics/occupancy', verifyJWTWithRole('admin'), getOccupancyByMovie)
router.get('/analytics/revenue-trend', verifyJWTWithRole('admin'), getRevenueTrend)

// GET /api/admin/transactions/stuck
// Returns all transactions in PENDING or MANUAL_REVIEW state older than 15 minutes.
// Includes populated user info and the raw Atom response for manual resolution.
router.get(
  '/transactions/stuck',
  verifyJWTWithRole('admin'),
  async (req, res) => {
    try {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)

      const stuck = await PendingTransaction.find({
        status: { $in: ['PENDING', 'MANUAL_REVIEW'] },
        createdAt: { $lte: fifteenMinAgo }
      })
        .sort({ createdAt: 1 })
        .lean()

      // Attach user info without exposing passwords
      const userIds = [...new Set(stuck.map((t) => t.userId.toString()))]
      const users = await User.find(
        { _id: { $in: userIds } },
        { name: 1, email: 1, phone: 1, usertype: 1 }
      ).lean()
      const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]))

      const result = stuck.map((t) => ({
        ...t,
        user: userMap[t.userId.toString()] || null,
        ageMinutes: Math.round((Date.now() - new Date(t.createdAt)) / 60000)
      }))

      return res.json({ count: result.length, transactions: result })
    } catch (err) {
      console.error('[admin] /transactions/stuck error:', err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
)

module.exports = router
