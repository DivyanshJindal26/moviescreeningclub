const mongoose = require('mongoose')

const foodItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer.'
      }
    }
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema({
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    default: () => {
      return this.user.email
    }
  },
  txnId: {
    type: String,
    required: true
  },
  foodList: {
    ref: 'Food',
    type: [foodItemSchema],
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  paid: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order
