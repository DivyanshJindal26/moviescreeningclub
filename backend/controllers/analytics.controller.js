const QR = require('@/models/qr.model')
const Movie = require('@/models/movie.model')
const Membership = require('@/models/membership.model')
const User = require('@/models/user/user.model')
const SeatMap = require('@/models/seatmap.model')

const getDashboardStats = async (req, res) => {
  try {
    const [totalMembers, activeMemberships, totalTickets, movies] =
      await Promise.all([
        User.countDocuments(),
        Membership.countDocuments({ isValid: true }),
        QR.countDocuments({ txnId: { $ne: 'BLOCK' } }),
        Movie.find({ currentscreening: true }).lean()
      ])

    const totalRevenue = await Membership.aggregate([
      { $match: { txnId: { $nin: ['test', 'coreteam', 'office'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    const membershipsByTier = await Membership.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: '$memtype', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    const recentTickets = await QR.aggregate([
      { $match: { txnId: { $ne: 'BLOCK' } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$registrationDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ])

    return res.json({
      totalMembers,
      activeMemberships,
      totalTickets,
      totalRevenue: totalRevenue[0]?.total || 0,
      currentMovies: movies.length,
      membershipsByTier: membershipsByTier.reduce(
        (acc, t) => ({ ...acc, [t._id]: t.count }),
        {}
      ),
      ticketTrend: recentTickets.reverse()
    })
  } catch (error) {
    console.error('Analytics dashboard error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getOccupancyByMovie = async (req, res) => {
  try {
    const movies = await Movie.find().lean()
    const results = []

    for (const movie of movies) {
      for (const showtime of movie.showtimes) {
        const seatmap = await SeatMap.findOne({
          showtimeId: showtime._id
        }).lean()
        if (!seatmap) continue

        const totalSeats = seatmap.seats instanceof Map
          ? seatmap.seats.size
          : Object.keys(seatmap.seats).length
        let booked = 0
        let blocked = 0
        const seats =
          seatmap.seats instanceof Map
            ? seatmap.seats
            : new Map(Object.entries(seatmap.seats))
        for (const [, qrId] of seats) {
          if (qrId) booked++
        }

        const blockedCount = await QR.countDocuments({
          showtime: showtime._id,
          txnId: 'BLOCK'
        })
        blocked = blockedCount

        results.push({
          movieTitle: movie.title,
          movieId: movie._id,
          showtimeId: showtime._id,
          date: showtime.date,
          totalSeats,
          booked,
          blocked,
          available: totalSeats - booked,
          occupancyRate:
            totalSeats > 0
              ? Math.round((booked / totalSeats) * 100 * 10) / 10
              : 0
        })
      }
    }

    results.sort((a, b) => new Date(b.date) - new Date(a.date))
    return res.json(results)
  } catch (error) {
    console.error('Occupancy analytics error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getRevenueTrend = async (req, res) => {
  try {
    const trend = await Membership.aggregate([
      { $match: { txnId: { $nin: ['test', 'coreteam', 'office'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$purchasedate' },
            month: { $month: '$purchasedate' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    const result = trend.map((t) => ({
      month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
      revenue: t.revenue,
      memberships: t.count
    }))

    return res.json(result)
  } catch (error) {
    console.error('Revenue trend error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { getDashboardStats, getOccupancyByMovie, getRevenueTrend }
