const QRCode = require('qrcode')
const jwt = require('jsonwebtoken')
const QR = require('@/models/qr.model')
const Movie = require('@/models/movie.model')
const SeatMap = require('@/models/seatmap.model')
const Membership = require('@/models/membership.model')
const memData = require('@constants/memberships.json')
const mongoose = require('mongoose')

const getQRs = async (req, res) => {
  const { userId } = req.user
  try {
    const allQRs = await QR.find({ user: userId }).sort({
      registrationDate: -1
    })

    const resQr = {
      used: [],
      unused: [],
      expired: [],
      cancelled: []
    }
    for (const qr of allQRs) {
      if (qr.expirationDate > new Date()) {
        if (qr.used) {
          resQr.used.push({
            expirationDate: qr.expirationDate,
            isValid: qr.isValid,
            registrationDate: qr.registrationDate,
            seat: qr.seat,
            used: qr.used
          })
        } else if (qr.deleted) {
          resQr.cancelled.push({
            expirationDate: qr.expirationDate,
            isValid: qr.isValid,
            registrationDate: qr.registrationDate,
            seat: qr.seat,
            used: qr.used
          })
        } else {
          if (!qr.expirationDate || isNaN(new Date(qr.expirationDate))) {
            console.error("Invalid expirationDate for QR:", qr._id);
            continue; // Skip this QR if it has no expiration date
          }
          
          const movie = qr.showtime ? await Movie.findOne({ 'showtimes._id': qr.showtime }) : null;
          const showtime = movie ? movie.showtimes.id(qr.showtime) : null;
          
          resQr.unused.push({
            id: qr._id,
            qrData: qr.code ? await QRCode.toDataURL(qr.code) : null, // Handle null qr.code
            expirationDate: qr.expirationDate,
            isValid: qr.isValid,
            registrationDate: qr.registrationDate,
            seat: qr.seat,
            used: qr.used,
            movie: movie ? {
              title: movie.title,
              genre: movie.genre,
              showtime: showtime
            } : null,
            free: qr.free || false
          });
          
        }
      } else {
        qr.isValid = false
        resQr.expired.push({
          expirationDate: qr.expirationDate,
          isValid: qr.isValid,
          registrationDate: qr.registrationDate,
          seat: qr.seat,
          used: qr.used
        })
        qr.save()
      }
    }

    res.status(200).json({ qrCodes: resQr })
  } catch (error) {
    console.error('Error fetching valid QR codes:', error)
    res.status(500).json({ error: 'Error fetching valid QR codes' })
  }
}

const cancelQr = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const qrId = req.params.id
    const qr = await QR.findOneAndUpdate(
      {
        _id: qrId,
        user: req.user.userId,
        // free: true,
        used: false,
        deleted: false
      },
      { deleted: true },
      {
        new: true,
        session
      }
    )
    if (!qr) {
      await session.abortTransaction()
      return res.status(404).json({ error: 'QR not found' })
    }
    const movie = qr?.showtime ? await Movie.findOne({ 'showtimes._id': qr.showtime }).session(session) : null;
    if (!movie) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    const seatMap = await SeatMap.findOneAndUpdate(
      { showtimeId: qr.showtime },
      { $set: { [`seats.${qr.seat}`]: null } },
      { new: true, session }
    );
    if (!seatMap) {
      await session.abortTransaction();
      return res.status(500).json({ error: 'Error cancelling QR' });
    }
    
    if (!movie.free) {
      // Find membership - for Film Fest Pass, don't check availQR
      const hasMembership = await Membership.findOne({
        user: req.user.userId,
        isValid: true,
        $or: [
          { memtype: 'filmFest' }, // Film Fest Pass doesn't use availQR
          { availQR: { $gt: 0 } } // Standard passes need availQR
        ]
      }).session(session)

      if (hasMembership) {
        // If Film Fest Pass, remove the movie from moviesUsed
        if (hasMembership.memtype === 'filmFest') {
          // Backward compatibility: initialize moviesUsed if it doesn't exist
          if (!hasMembership.moviesUsed) {
            hasMembership.moviesUsed = []
          }
          hasMembership.moviesUsed = hasMembership.moviesUsed.filter(
            (id) => id.toString() !== qr.showtime.toString()
          )
        } else {
          hasMembership.availQR += 1
        }
        hasMembership.validitydate = new Date(
          Date.now() + hasMembership.validity * 1000
        )
        await hasMembership.save({ session })
      } else {
        const { validity } = memData.find((m) => m.name === 'base')
        const assignMembership = new Membership({
          user: req.user.userId,
          memtype: 'base',
          txnId: 'cancelTicketAutoAdd',
          validity,
          availQR: 1,
          amount: 0,
          validitydate: new Date(Date.now() + validity * 1000)
        })
        await assignMembership.save({ session })
      }
    }
    await session.commitTransaction()
    return res.status(200).json({ message: 'QR cancelled' })
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    console.error('Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  } finally {
    if (session) {
      session.endSession()
    }
  }
}

const check = async (req, res) => {
  try {
    const qrData = req.body.qrData
    if (!qrData) {
      return res.status(400).json({ error: 'No QR data provided' })
    }
    let userId, qrId, seat, hash
    try {
      ;({ userId, qrId, seat, hash } = jwt.verify(
        qrData,
        process.env.JWT_SECRET_QR ?? 'lolbhai'
      ))
    } catch (err) {
      return res.status(400).json({ error: 'Invalid QR data' })
    }
    const qr = await QR.findOne({ _id: qrId, user: userId, seat, code: qrData })
      .populate('user')
      .populate('membership')

    if (!qr) {
      return res.json({ exists: false })
    }
    if (qr.deleted) {
      return res.json({
        exists: true,
        cancelled: true
      })
    }
    if (qr.used) {
      return res.json({
        exists: true,
        validityPassed: false,
        used: true
      })
    }
    if (qr.expirationDate < new Date()) {
      qr.isValid = false
      qr.save()
      return res.json({
        exists: true,
        validityPassed: true,
        used: false
      })
    }

    const updateed = await QR.findOneAndUpdate(
      { _id: qrId, used: false },
      { used: true }
    )
    if (!updateed) {
      return res.json({
        exists: true,
        validityPassed: false,
        used: true
      })
    }
    const movie = qr?.showtime ? await Movie.findOne({ 'showtimes._id': qr.showtime }) : null;
    const showtime = movie ? movie.showtimes.id(qr.showtime) : null;
    
    return res.json({
      exists: true,
      validityPassed: false,
      used: false,
      cancelled: false,
      email: qr.user?.email || 'Unknown',
      seat: qr.seat,
      name: qr.user?.name || 'Unknown',
      show: showtime ? showtime.date : 'Unknown',
      movie: movie?.title || 'Unknown'
    });
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
module.exports = {
  getQRs,
  check,
  cancelQr
}
