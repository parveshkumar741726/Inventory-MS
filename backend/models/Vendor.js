const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add vendor name'],
  },
  firmName: {
    type: String,
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
  },
  email: {
    type: String,
    lowercase: true,
  },
  address: {
    type: String,
  },
  gstNumber: {
    type: String,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  openingBalanceType: {
    type: String,
    enum: ['debit', 'credit'],
    default: 'debit',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
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

vendorSchema.index({ name: 1 });
vendorSchema.index({ status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
