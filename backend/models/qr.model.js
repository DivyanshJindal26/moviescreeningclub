const mongoose = require('mongoose')

const QRSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  txnId: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  OTP: {
    type: String
  },
  used: {
    type: Boolean,
    default: false
  },
  isValid: {
    type: Boolean,
    default: true
  },
  seat: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    default: new Date('2100-01-01T12:00:00Z')
  }
})

if (!mongoose.models.QR) {
  mongoose.model('QR', QRSchema)
}

module.exports = mongoose.models.QR
