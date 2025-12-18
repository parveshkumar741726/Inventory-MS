const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
  },
  amount: {
    type: Number,
    required: [true, 'Please add payment amount'],
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'bank'],
    required: [true, 'Please add payment mode'],
  },
  referenceNumber: {
    type: String,
  },
  paymentDate: {
    type: Date,
    required: [true, 'Please add payment date'],
  },
  notes: {
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

paymentSchema.index({ vendor: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
