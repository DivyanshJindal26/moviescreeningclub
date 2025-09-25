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
const User = require('@/models/user/user.model')
const bcrypt = require('bcrypt')
const OnSpotTicket = require('@/models/onspot.model')
const mongoose = require('mongoose')

const seatOccupancy = async (req, res) => {
  try {
    const { showtimeId } = req.params

    const seatMap = await SeatMap.findOne({ showtimeId: showtimeId })

    if (!seatMap || seatMap.date < new Date(Date.now() - 3 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Invalid showtime' })
    }
    const resSeats = []
    for ([seat, qr] of Object(seatMap.seats).entries()) {
      const row = rows.find((row) => seat.includes(row.prefix))
      const adder =
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].indexOf(row.prefix) === -1
          ? 3
          : 0

      resSeats.push({
        occupied: !!qr,
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
    const currentMembership = await Membership.findOne({
      user: req.user.userId,
      isValid: true
    })
    for (seat of seats) {
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
      if (!currentMembership) {
        return res.status(400).json({ error: 'no active membership' })
      }
      if (currentMembership.validitydate < new Date()) {
        currentMembership.isValid = false
        await currentMembership.save()

        return res.status(400).json({ error: 'no active membership' })
      }
      if (currentMembership.availQR < seats.length) {
        return res
          .status(400)
          .json({ error: 'No valid membership or not enough passes left' })
      }
    }
    for (let seat of seats) {
      if (seatMap.seats.get(seat)) {
        seatRes.push({
          seat: seat,
          message: 'Seat already assigned'
        })
        continue
      }

      const qr = new QR({
        user: req.user.userId,
        membership: movie.free ? null : currentMembership._id,
        txnId: movie.free ? null : currentMembership._id,
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
        if (!movie.free) {
          currentMembership.availQR -= 1
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

    if (currentMembership) {
      if (currentMembership.availQR === 0) {
        currentMembership.isValid = false
      }
      await currentMembership.save()
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

const seatAssignOnSpot = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const { seats, user, cost } = req.body

    if (!seats || !seats.length) {
      return res.status(400).json({ error: 'No seats provided' })
    }

    const seatMap = await SeatMap.findOne({ showtimeId })
    if (!seatMap) return res.status(400).json({ error: 'Invalid showtime' })

    const movie = await Movie.findOne({ 'showtimes._id': showtimeId })
    if (!movie || movie.past)
      return res.status(400).json({ error: 'Invalid showtime' })
    const showtime = movie.showtimes.id(showtimeId)

    if (new Date(showtime.date) < Date.now() - 3 * 60 * 60 * 1000)
      return res.status(400).json({ error: 'Invalid showtime' })

    // Validate seat names
    for (let seat of seats) {
      if (!seatMap.seats.has(seat))
        return res.status(400).json({ error: `Invalid seat: ${seat}` })
      if (seatMap.seats.get(seat))
        return res.status(400).json({ error: `${seat} already booked` })
    }

    const seatRes = []

    for (let seat of seats) {
      // Lock seat in SeatMap
      const qr = new QR({
        user,
        membership: 'onspot',
        txnId: 'onspot',
        seat,
        showtime: showtimeId,
        code: '',
        free: movie.free || false,
        expirationDate: new Date(
          new Date(showtime.date).getTime() + 3 * 60 * 60 * 1000
        )
      })
      const code = jwt.sign(
        {
          userId: user,
          qrId: qr._id,
          seat,
          hash: crypto.randomBytes(16).toString('hex')
        },
        process.env.JWT_SECRET_QR || 'lolbhai'
      )
      qr.code = code
      await qr.save()

      const updatedSeatMap = await SeatMap.findOneAndUpdate(
        { _id: seatMap._id, [`seats.${seat}`]: null },
        { $set: { [`seats.${seat}`]: qr._id } },
        { new: true }
      )
      if (!updatedSeatMap) {
        await QR.deleteOne({ _id: qr._id }) // rollback QR
        return res.status(400).json({ error: `Failed to lock seat: ${seat}` })
      }
      seatRes.push({
        seat,
        qrId: qr._id,
        code: qr.code,
        message: 'Seat locked for payment'
      })
    }

    // Create OnSpotTicket (TTL 5 min)
    const ticket = new OnSpotTicket({
      showtimeId,
      seats,
      user,
      cost,
      status: 'locked'
    })
    await ticket.save()
    return res.json(seatRes)
  } catch (err) {
    console.error('Error assigning on-spot seats:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const deleteSeatAssign = async (req, res) => {
  try {
    const { showtimeId } = req.params
    const { seats } = req.body

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

    for (seat of seats) {
      if (!seatMap.seats.has(seat)) {
        return res.status(400).json({ error: 'Invalid seat(s)' })
      }
    }

    let seatRes = []

    for (let seat of seats) {
      const qrId = seatMap.seats.get(seat)
      if (!qrId) {
        seatRes.push({
          seat: seat,
          message: 'Seat not assigned'
        })
        continue
      }

      try {
        // Find and delete the QR code
        const qr = await QR.findById(qrId)
        if (!qr) {
          seatRes.push({
            seat: seat,
            message: 'QR code not found'
          })
          continue
        }

        // Mark QR as deleted
        qr.deleted = true
        await qr.save()

        // Remove seat assignment from seatmap
        const updatedSeatMap = await SeatMap.findOneAndUpdate(
          {
            _id: seatMap._id,
            [`seats.${seat}`]: qrId
          },
          { $unset: { [`seats.${seat}`]: '' } },
          { new: true }
        )

        if (updatedSeatMap) {
          seatRes.push({
            seat: seat,
            message: 'Seat unassigned successfully'
          })
        } else {
          throw new Error('Error unassigning seat')
        }
      } catch (error) {
        console.error(`Error unassigning seat ${seat}:`, error)
        seatRes.push({
          seat: seat,
          message: 'Error unassigning seat'
        })
      }
    }

    if (seatRes.length === 0) {
      return res.status(400).json({ error: 'Error unassigning seats' })
    }

    return res.json(seatRes.map((s) => ({ seat: s.seat, message: s.message })))
  } catch (error) {
    console.error('Error unassigning seats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  seatOccupancy,
  seatAssign,
  freepasses,
  getMails,
  seatAssignOnSpot,
  deleteSeatAssign
}
