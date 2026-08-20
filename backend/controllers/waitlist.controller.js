const Waitlist = require('@/models/waitlist.model')
const Movie = require('@/models/movie.model')
const SeatMap = require('@/models/seatmap.model')
const { waitlistMail } = require('@/utils/mail')

const joinWaitlist = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const { seatsRequested } = req.body
    const userId = req.user.userId

    const movie = await Movie.findOne({ 'showtimes._id': showtimeId })
    if (!movie) return res.status(404).json({ error: 'Showtime not found' })

    const existing = await Waitlist.findOne({
      user: userId,
      showtime: showtimeId
    })
    if (existing) {
      return res.status(409).json({ error: 'Already on waitlist for this showtime' })
    }

    const entry = new Waitlist({
      user: userId,
      showtime: showtimeId,
      movie: movie._id,
      seatsRequested: seatsRequested || 1
    })
    await entry.save()

    const position = await Waitlist.countDocuments({
      showtime: showtimeId,
      createdAt: { $lte: entry.createdAt }
    })

    return res.status(201).json({ position })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Already on waitlist' })
    }
    console.error('Waitlist join error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const leaveWaitlist = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const userId = req.user.userId

    const result = await Waitlist.deleteOne({
      user: userId,
      showtime: showtimeId
    })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not on waitlist' })
    }
    return res.json({ message: 'Removed from waitlist' })
  } catch (error) {
    console.error('Waitlist leave error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getWaitlistStatus = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const userId = req.user.userId

    const entry = await Waitlist.findOne({
      user: userId,
      showtime: showtimeId
    })
    if (!entry) return res.json({ onWaitlist: false })

    const position = await Waitlist.countDocuments({
      showtime: showtimeId,
      createdAt: { $lte: entry.createdAt }
    })

    return res.json({
      onWaitlist: true,
      position,
      seatsRequested: entry.seatsRequested,
      notified: entry.notified
    })
  } catch (error) {
    console.error('Waitlist status error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getWaitlistCount = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const count = await Waitlist.countDocuments({ showtime: showtimeId })
    return res.json({ count })
  } catch (error) {
    console.error('Waitlist count error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const notifyWaitlist = async (showtimeId, availableSeats) => {
  try {
    const entries = await Waitlist.find({
      showtime: showtimeId,
      notified: false
    })
      .sort({ createdAt: 1 })
      .populate('user', 'email name')
      .populate('movie', 'title')

    let remaining = availableSeats
    for (const entry of entries) {
      if (remaining <= 0) break
      if (entry.seatsRequested <= remaining) {
        try {
          await waitlistMail(
            entry.user.email,
            entry.user.name,
            entry.movie.title,
            entry.seatsRequested
          )
          entry.notified = true
          await entry.save()
          remaining -= entry.seatsRequested
        } catch (emailErr) {
          console.error('Waitlist notification email failed:', emailErr)
        }
      }
    }
  } catch (error) {
    console.error('Waitlist notification error:', error)
  }
}

const adminGetWaitlist = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const list = await Waitlist.find({ showtime: showtimeId })
      .sort({ createdAt: 1 })
      .populate('user', 'email name phone')
      .lean()

    const result = list.map((e, i) => ({
      position: i + 1,
      name: e.user?.name,
      email: e.user?.email,
      phone: e.user?.phone,
      seatsRequested: e.seatsRequested,
      notified: e.notified,
      joinedAt: e.createdAt
    }))

    return res.json(result)
  } catch (error) {
    console.error('Admin waitlist error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
  getWaitlistCount,
  notifyWaitlist,
  adminGetWaitlist
}
