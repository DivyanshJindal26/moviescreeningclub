const mongoose = require('mongoose')

const WaitlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  seatsRequested: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  notified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

WaitlistSchema.index({ showtime: 1, user: 1 }, { unique: true })
WaitlistSchema.index({ showtime: 1, notified: 1, createdAt: 1 })

if (!mongoose.models.Waitlist) {
  mongoose.model('Waitlist', WaitlistSchema)
}

module.exports = mongoose.models.Waitlist
