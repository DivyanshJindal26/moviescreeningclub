const express = require('express')
const router = express.Router()
const Movie = require('@/models/movie.model')
const QR = require('@/models/qr.model')
const { verifyJWTWithRole } = require('@/middleware')

router.get('/movie-ticket-emails/:movieId', verifyJWTWithRole('admin'), async (req, res) => {
  try {
    const { movieId } = req.params

    // Find the movie
    const movie = await Movie.findById(movieId)
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' })
    }

    // Get all showtimes for this movie
    const showtimeIds = movie.showtimes.map((showtime) => showtime._id)

    // Find all QR codes (tickets) for these showtimes
    const tickets = await QR.find({ showtime: { $in: showtimeIds } })
      .populate('user', 'email name phone')
      .lean()

    // Extract unique emails
    const emails = [...new Set(tickets.map((ticket) => ticket.user.email))]

    res.json({
      movieTitle: movie.title,
      movieId: movieId,
      totalTickets: tickets.length,
      uniqueUsers: emails.length,
      emails: emails,
      ticketDetails: tickets.map((ticket) => ({
        email: ticket.user.email,
        name: ticket.user.name,
        phone: ticket.user.phone,
        seat: ticket.seat,
        code: ticket.code,
        registrationDate: ticket.registrationDate
      }))
    })
  } catch (error) {
    console.error('Error fetching ticket emails:', error)
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message })
  }
})

router.get('/movie-ticket-prefix-breakdown/:movieId', verifyJWTWithRole('admin'), async (req, res) => {
  try {
    const { movieId } = req.params

    // Find the movie
    const movie = await Movie.findById(movieId)
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' })
    }

    // Get all showtimes for this movie
    const showtimeIds = movie.showtimes.map((showtime) => showtime._id)

    // Find all QR codes (tickets) for these showtimes
    const tickets = await QR.find({ showtime: { $in: showtimeIds } })
      .populate('user', 'email')
      .lean()

    // Extract prefix from emails and count them
    const prefixCount = {}
    const othersEmails = []

    tickets.forEach((ticket) => {
      const email = ticket.user.email
      // Extract just the first 3-4 characters (letters only)
      const match = email.match(/^([a-zA-Z]+)/)
      
      if (match) {
        const prefix = match[1] // e.g., "b", "im"
        prefixCount[prefix] = (prefixCount[prefix] || 0) + 1
      } else {
        othersEmails.push(email)
      }
    })

    // Sort prefixes for better readability
    const sortedPrefixes = Object.entries(prefixCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .reduce((acc, [key, val]) => {
        acc[key] = val
        return acc
      }, {})

    res.json({
      movieTitle: movie.title,
      movieId: movieId,
      totalTickets: tickets.length,
      prefixBreakdown: sortedPrefixes,
      othersCount: othersEmails.length,
      othersEmails: othersEmails
    })
  } catch (error) {
    console.error('Error fetching prefix breakdown:', error)
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message })
  }
})

module.exports = router
