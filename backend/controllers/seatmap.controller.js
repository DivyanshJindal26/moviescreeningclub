require('dotenv').config()
const SeatMap = require('@/models/seatmap.model')
const QR = require('@/models/qr.model')
const Movie = require('@/models/movie.model')
const Membership = require('@/models/membership.model')
const { mailQRs } = require('@/utils/mail')
const crypto = require('crypto')
const { rows } = require('@constants/seats')
const jwt = require('jsonwebtoken')
const freeConfig = require('../../constants/free.json')
const { getUserType } = require('@/utils/user')

const seatOccupancy = async (req, res) => {
  try {
    const { showtimeId } = req.params

    const seatMap = await SeatMap.findOne({ showtimeId: showtimeId })

    if (!seatMap || seatMap.date < new Date(Date.now() - 3 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }
    const resSeats = []
    for (const [seat, qr] of Object(seatMap.seats).entries()) {
      const row = rows.find((row) => seat.includes(row.prefix))
      const adder =
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].indexOf(row.prefix) === -1
          ? 3
          : 0

      resSeats.push({
        occupied: !!qr,
        type: qr?.txnId === 'BLOCK' ? 'blocked' : 'booked',
        name: seat,
        sec:
          (parseInt(seat.slice(1)) > row.center + row.right
            ? 1
            : parseInt(seat.slice(1)) > row.right
              ? 2
              : 3) + adder
      })
    }
    resSeats.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    return res.json(resSeats)
  } catch (error) {
    console.error('Error fetching seat occupancy:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
const freepasses = async (req, res) => {
  try {
    const { showtimeId } = req.params

    const movie = await Movie.findOne({ 'showtimes._id': showtimeId })

    if (!movie || movie.past) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    // Calculate the number of free passes left
    const count = await QR.countDocuments({
      showtime: {
        $in: movie.showtimes.map((showtime) => showtime._id)
      },
      free: true,
      user: req.user.userId,
      deleted: false
    })
    return res.status(200).json({ count })
  } catch (error) {
    console.error('Error calculating number of free seats left:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
const getMails = async (req, res) => {
  const { showtimeId } = req.params
  const emails = await QR.find({ showtime: showtimeId })
    .select('user')
    .populate({ path: 'user', select: 'email' })

  return res.json(emails.map((email) => email.user.email))
}
const seatAssign = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const { seats } = req.body
    const userDesignation = getUserType(req.user.email)
    if (!seats || !seats.length) {
      return res.status(400).json({ error: 'No seats provided' })
    }
    const seatMap = await SeatMap.findOne({ showtimeId: showtimeId })
    if (!seatMap) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    const movie = await Movie.findOne({ 'showtimes._id': showtimeId })
    if (!movie || movie.past) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }
    const showtime = movie.showtimes.id(showtimeId)

    if (new Date(showtime.date) < new Date(Date.now() - 3 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }
    const activeMemberships = await Membership.find({
      user: req.user.userId,
      isValid: true
    }).sort({ validitydate: 1 })

    const standardMemberships = activeMemberships.filter(
      (m) => m.memtype !== 'filmFest' && m.validitydate >= new Date()
    )
    const filmFestMemberships = activeMemberships.filter(
      (m) => m.memtype === 'filmFest' && m.validitydate >= new Date()
    )

    const totalStandardPasses = standardMemberships.reduce(
      (sum, m) => sum + m.availQR,
      0
    )

    for (const seat of seats) {
      if (!seatMap.seats.has(seat)) {
        return res.status(400).json({ error: 'Invalid seat(s)' })
      }
    }
    let seatRes = []
    if (movie.free) {
      const freeCount = freeConfig.find(
        (fc) => fc.type === userDesignation
      ).free
      if (seats.length > freeCount) {
        return res.status(400).json({ error: `Only ${freeCount} seat allowed` })
      }
      const anyTicket = await QR.countDocuments({
        showtime: {
          $in: movie.showtimes.map((showtime) => showtime._id)
        },
        free: true,
        deleted: false,
        user: req.user.userId
      })

      if (seats.length > freeCount - anyTicket) {
        return res.status(400).json({
          error: `Already booked ${anyTicket} or more free tickets`
        })
      }
    } else {
      if (standardMemberships.length === 0 && filmFestMemberships.length === 0) {
        return res.status(400).json({ error: 'no active membership' })
      }

      // Try to use standard memberships first
      if (totalStandardPasses >= seats.length) {
        // Standard memberships have enough passes
      } else if (filmFestMemberships.length > 0 && seats.length === 1) {
        // Check if any filmFest membership can be used for this showtime
        let canUseFilmFest = false
        for (const ffm of filmFestMemberships) {
          if (!ffm.moviesUsed) ffm.moviesUsed = []
          const moviesUsedCount = ffm.moviesUsed.length
          const movieLimit = ffm.movieCount || 0
          if (moviesUsedCount >= movieLimit) continue

          const existingTicket = await QR.findOne({
            user: req.user.userId,
            membership: ffm._id,
            showtime: showtimeId,
            deleted: false
          })
          if (!existingTicket) {
            canUseFilmFest = true
            break
          }
        }
        if (!canUseFilmFest && totalStandardPasses < seats.length) {
          return res
            .status(400)
            .json({ error: 'No valid membership or not enough passes left' })
        }
      } else {
        return res
          .status(400)
          .json({ error: 'No valid membership or not enough passes left' })
      }
    }

    // Build a list of memberships to consume from (soonest-expiring first)
    // Standard memberships are preferred; filmFest used only when standard passes are insufficient
    let useFilmFest = false
    let filmFestMembership = null
    if (!movie.free && totalStandardPasses < seats.length && filmFestMemberships.length > 0 && seats.length === 1) {
      for (const ffm of filmFestMemberships) {
        if (!ffm.moviesUsed) ffm.moviesUsed = []
        if (ffm.moviesUsed.length < (ffm.movieCount || 0)) {
          const existingTicket = await QR.findOne({
            user: req.user.userId,
            membership: ffm._id,
            showtime: showtimeId,
            deleted: false
          })
          if (!existingTicket) {
            useFilmFest = true
            filmFestMembership = ffm
            break
          }
        }
      }
    }

    let standardIdx = 0
    const modifiedMemberships = new Set()

    for (let seat of seats) {
      if (seatMap.seats.get(seat)) {
        seatRes.push({
          seat: seat,
          message: 'Seat already assigned'
        })
        continue
      }

      let membershipForSeat = null
      if (!movie.free) {
        if (useFilmFest) {
          membershipForSeat = filmFestMembership
        } else {
          while (standardIdx < standardMemberships.length && standardMemberships[standardIdx].availQR <= 0) {
            standardIdx++
          }
          if (standardIdx < standardMemberships.length) {
            membershipForSeat = standardMemberships[standardIdx]
          }
        }
      }

      const qr = new QR({
        user: req.user.userId,
        membership: movie.free ? null : membershipForSeat?._id,
        txnId: movie.free ? null : membershipForSeat?._id,
        seat: seat,
        showtime: showtimeId,
        code: '',
        free: movie.free || false,
        expirationDate: new Date(
          new Date(showtime.date).getTime() + 3 * 60 * 60 * 1000
        )
      })
      const code = jwt.sign(
        {
          userId: req.user.userId,
          qrId: qr._id,
          seat: seat,
          hash: crypto.randomBytes(16).toString('hex')
        },
        process.env.JWT_SECRET_QR || 'lolbhai'
      )
      qr.code = code
      try {
        const updatedSeatMap = await SeatMap.findOneAndUpdate(
          {
            _id: seatMap._id,
            [`seats.${seat}`]: null
          },
          { $set: { [`seats.${seat}`]: qr._id } },
          { new: true }
        )
        if (updatedSeatMap) {
          await qr.save()
        } else {
          throw new Error('Error assigning seat')
        }
        if (!movie.free && membershipForSeat) {
          if (useFilmFest && membershipForSeat.memtype === 'filmFest') {
            if (!membershipForSeat.moviesUsed.includes(showtimeId)) {
              membershipForSeat.moviesUsed.push(showtimeId)
            }
          } else {
            membershipForSeat.availQR -= 1
          }
          modifiedMemberships.add(membershipForSeat)
        }
        seatRes.push({
          seat: seat,
          qrId: qr._id,
          code: qr.code,
          message: 'Seat assigned'
        })
      } catch (error) {
        seatRes.push({
          seat: seat,
          message: 'Error assigning seat'
        })
      }
    }

    for (const mem of modifiedMemberships) {
      if (mem.memtype === 'filmFest') {
        const moviesUsed = mem.moviesUsed || []
        const movieCount = mem.movieCount || 0
        if (moviesUsed.length >= movieCount) {
          mem.isValid = false
        }
      } else if (mem.availQR === 0) {
        mem.isValid = false
      }
      await mem.save()
    }

    if (seatRes.length === 0) {
      return res.status(400).json({ error: 'Error assigning seats' })
    }
    if (seatRes.some((s) => s.message === 'Seat assigned')) {
      try {
        mailQRs(
          seatRes.filter((s) => s.message === 'Seat assigned'),
          req.user,
          movie,
          showtime
        )
      } catch (error) {
        console.log('Error sending mail:', error)
      }
    }
    return res.json(seatRes.map((s) => ({ seat: s.seat, message: s.message })))
  } catch (error) {
    console.error('Error assigning seats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const blockSeat = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const { seats, name } = req.body

    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'No seats provided' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'No name provided' })
    }

    const seatMap = await SeatMap.findOne({ showtimeId: showtimeId })
    if (!seatMap) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    const movie = await Movie.findOne({ 'showtimes._id': showtimeId })
    if (!movie || movie.past) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    const showtime = movie.showtimes.id(showtimeId)
    if (!showtime) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    if (new Date(showtime.date) < new Date(Date.now() - 3 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }

    for (let seat of seats) {
      if (!seatMap.seats.has(seat)) {
        return res.status(400).json({ error: `Invalid seat: ${seat}` })
      }
      if (seatMap.seats.get(seat)) {
        return res.status(400).json({ error: `Seat already assigned: ${seat}` })
      }
    }

    const blockedSeats = []
    for (let seat of seats) {
      const qr = new QR({
        user: req.user.userId,
        free: false,
        membership: null,
        txnId: 'BLOCK',
        showtime: showtimeId,
        seat: seat,
        code: '',
        expirationDate: new Date(
          new Date(showtime.date).getTime() + 3 * 60 * 60 * 1000
        ),
        label: name
      })
      const code = jwt.sign(
        {
          userId: req.user.userId,
          qrId: qr._id,
          seat: seat,
          hash: crypto.randomBytes(16).toString('hex')
        },
        process.env.JWT_SECRET_QR || 'lolbhai'
      )
      qr.code = code
      await qr.save()
      await SeatMap.findOneAndUpdate(
        {
          _id: seatMap._id,
          [`seats.${seat}`]: null
        },
        { $set: { [`seats.${seat}`]: qr._id } },
        { new: true }
      )
      blockedSeats.push(seat)
    }

    return res.json({ message: 'Seats blocked', seats: blockedSeats })
  } catch (error) {
    console.error('Error blocking seats:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { seatOccupancy, seatAssign, freepasses, getMails, blockSeat }
