const mongoose = require('mongoose')

const pendingTransactionSchema = new mongoose.Schema({
  // Our internal ID sent to Atom as merchTxnId — unique so duplicate saves fail hard
  merchTxnId: { type: String, required: true, unique: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memtype: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'],
    default: 'PENDING'
  },
  // Atom's own transaction ID — populated once confirmed
  atomTxnId: { type: String },
  // Raw Atom status response, kept for manual review and debugging
  rawAtomResponse: { type: mongoose.Schema.Types.Mixed },
  reconciliationAttempts: { type: Number, default: 0 },
  lastReconciliationAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
})

// Compound index for the reconciliation query: status=PENDING, createdAt <= N minutes ago
pendingTransactionSchema.index({ status: 1, createdAt: 1 })

if (!mongoose.models.PendingTransaction) {
  mongoose.model('PendingTransaction', pendingTransactionSchema)
}
module.exports = mongoose.models.PendingTransaction
