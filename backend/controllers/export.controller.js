const QR = require('@/models/qr.model')
const Movie = require('@/models/movie.model')
const Membership = require('@/models/membership.model')

const toCsv = (headers, rows) => {
  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

const exportTickets = async (req, res) => {
  try {
    const { movieId } = req.params
    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ error: 'Movie not found' })

    const showtimeIds = movie.showtimes.map((s) => s._id)
    const tickets = await QR.find({ showtime: { $in: showtimeIds } })
      .populate('user', 'email name phone designation')
      .populate('membership', 'memtype amount')
      .lean()

    const showtimeMap = {}
    for (const st of movie.showtimes) {
      showtimeMap[st._id.toString()] = st.date
    }

    const headers = [
      'email', 'name', 'phone', 'designation', 'seat',
      'showtime_date', 'membership_type', 'amount', 'free',
      'used', 'blocked', 'registration_date'
    ]

    const rows = tickets.map((t) => ({
      email: t.user?.email,
      name: t.user?.name,
      phone: t.user?.phone,
      designation: t.user?.designation,
      seat: t.seat,
      showtime_date: showtimeMap[t.showtime?.toString()]
        ? new Date(showtimeMap[t.showtime.toString()]).toISOString()
        : '',
      membership_type: t.membership?.memtype || (t.txnId === 'BLOCK' ? 'BLOCK' : 'free'),
      amount: t.membership?.amount ?? 0,
      free: t.free ? 'Yes' : 'No',
      used: t.used ? 'Yes' : 'No',
      blocked: t.txnId === 'BLOCK' ? 'Yes' : 'No',
      registration_date: new Date(t.registrationDate).toISOString()
    }))

    const csv = toCsv(headers, rows)
    const filename = `tickets_${movie.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (error) {
    console.error('Error exporting tickets:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const exportMemberships = async (req, res) => {
  try {
    const { year, month } = req.query
    const filter = {}
    if (year && month) {
      filter.purchasedate = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    }

    const memberships = await Membership.find(filter)
      .populate('user', 'email name phone designation')
      .sort({ purchasedate: -1 })
      .lean()

    const headers = [
      'email', 'name', 'phone', 'designation', 'membership_type',
      'amount', 'passes', 'is_valid', 'purchase_date', 'expiry_date', 'txn_id'
    ]

    const rows = memberships.map((m) => ({
      email: m.user?.email,
      name: m.user?.name,
      phone: m.user?.phone,
      designation: m.user?.designation,
      membership_type: m.memtype,
      amount: m.amount,
      passes: m.memtype === 'filmFest' ? m.movieCount : m.availQR,
      is_valid: m.isValid ? 'Yes' : 'No',
      purchase_date: new Date(m.purchasedate).toISOString(),
      expiry_date: new Date(m.validitydate).toISOString(),
      txn_id: m.txnId
    }))

    const csv = toCsv(headers, rows)
    const filename = year && month
      ? `memberships_${year}_${month}.csv`
      : 'memberships_all.csv'
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (error) {
    console.error('Error exporting memberships:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const exportRevenue = async (req, res) => {
  try {
    const revenue = await Membership.aggregate([
      { $match: { txnId: { $nin: ['test', 'coreteam', 'office'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$purchasedate' },
            month: { $month: '$purchasedate' },
            memtype: '$memtype'
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.memtype': 1 } }
    ])

    const headers = ['year', 'month', 'membership_type', 'count', 'total_revenue']
    const rows = revenue.map((r) => ({
      year: r._id.year,
      month: r._id.month,
      membership_type: r._id.memtype,
      count: r.count,
      total_revenue: r.total
    }))

    const csv = toCsv(headers, rows)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.csv"')
    return res.send(csv)
  } catch (error) {
    console.error('Error exporting revenue:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { exportTickets, exportMemberships, exportRevenue }
