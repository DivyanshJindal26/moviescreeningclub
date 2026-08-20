const mongoose = require('mongoose')

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  memtype: {
    type: String,
    enum: ['base', 'silver', 'gold', 'diamond', 'filmFest', 'foodieFilmFest']
  },
  isValid: {
    type: Boolean,
    default: true
  },
  txnId: {
    type: String,
    required: true
  },
  // seconds
  validity: Number,
  availQR: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: true
  },
  purchasedate: {
    type: Date,
    default: Date.now
  },
  validitydate: {
    type: Date,
    default: function () { return new Date(Date.now() + this.validity * 1000) }
  },
  // For Film Fest Pass: tracks which movies have been used
  moviesUsed: {
    type: [mongoose.Schema.Types.ObjectId], // Array of movie IDs (showtimes)
    default: undefined,
    validate: {
      validator: function (v) {
        if (this.memtype === 'filmFest' || this.memtype === 'foodieFilmFest') {
          return Array.isArray(v)
        }
        return true
      },
      message: 'moviesUsed must be an array for Film Fest memberships'
    }
  },
  movieCount: {
    type: Number, // Total number of movies allowed for Film Fest Pass
    validate: {
      validator: function (v) {
        if (this.memtype === 'filmFest' || this.memtype === 'foodieFilmFest') {
          return v != null && v > 0
        }
        return true
      },
      message:
        'movieCount is required and must be greater than 0 for Film Fest memberships'
    }
  }
})

if (!mongoose.models.Membership) {
  mongoose.model('Membership', membershipSchema)
}

module.exports = mongoose.models.Membership



