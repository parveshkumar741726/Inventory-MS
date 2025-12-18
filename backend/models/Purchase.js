const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Please add invoice number'],
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Please add invoice date'],
  },
  invoiceFile: {
    url: String,
    publicId: String,
  },
  taxType: {
    type: String,
    enum: ['inclusive', 'exclusive'],
    default: 'exclusive',
  },
  subtotal: {
    type: Number,
    required: true,
  },
  totalTax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  pendingAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending',
  },
  notes: {
    type: String,
  },
  damageQuantity: {
    type: Number,
    default: 0,
  },
  missingQuantity: {
    type: Number,
    default: 0,
  },
  remark: {
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

purchaseSchema.index({ vendor: 1 });
purchaseSchema.index({ invoiceDate: -1 });
purchaseSchema.index({ status: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
