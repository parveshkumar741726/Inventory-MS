const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['opening', 'purchase', 'payment', 'adjustment'],
    required: true,
  },
  reference: {
    type: String,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  debit: {
    type: Number,
    default: 0,
  },
  credit: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

ledgerSchema.index({ vendor: 1, date: -1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
