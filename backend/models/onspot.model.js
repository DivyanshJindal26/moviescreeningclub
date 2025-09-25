const { ChangeStream } = require('mongodb')
const mongoose = require('mongoose')
const OnSpotTicketSchema = new mongoose.Schema({
  showtimeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Showtime',
    required: true
  },
  seats: [
    {
      type: String, // e.g. "A10"
      required: true
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['locked', 'paid', 'expired', 'cancelled'],
    default: 'locked'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // TTL index → 5 minutes
  }
})

// No need to define the TTL index twice as it's already defined in the schema

const OnSpotTicket =
  mongoose.models.OnSpotTicket ||
  mongoose.model('OnSpotTicket', OnSpotTicketSchema)

module.exports = OnSpotTicket
