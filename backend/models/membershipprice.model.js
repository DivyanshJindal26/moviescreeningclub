const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  price: { type: Number, required: true },
});

const membershipPriceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: [priceSchema], required: true },
  validity: { type: Number, required: true }, // Validity in seconds
  availQR: { type: Number, required: true }, // Number of available QR codes
});

// Create a Mongoose model for 'ticketPrice' collection
const MembershipPrice = mongoose.model("MembershipPrice", membershipPriceSchema, "ticketPrice");


module.exports = MembershipPrice;

