const mongoose = require('mongoose')

const QRSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  free: {
    type: Boolean,
    default: false
  },
  membership: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Membership',
    required: function () {
      return !this.free && this.membershipType !== 'onspot'
    },
    validate: {
      validator: function (v) {
        return v === 'onspot' || mongoose.Types.ObjectId.isValid(v)
      },
      message: (props) => `${props.value} is not a valid ObjectId or 'onspot'!`
    }
  },
  membershipType: {
    type: String,
    enum: ['normal', 'onspot'],
    default: 'normal'
  },
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  txnId: {
    type: String,
    required: function () {
      return !this.free
    }
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
  deleted: {
    type: Boolean,
    default: false
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
