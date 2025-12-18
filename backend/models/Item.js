const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  stockId: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{6}$/.test(v);
      },
      message: 'Stock ID must be exactly 6 digits'
    }
  },
  name: {
    type: String,
    required: [true, 'Please add item name'],
    unique: true,
  },
  unit: {
    type: String,
    required: [true, 'Please add unit'],
  },
  currentStock: {
    type: Number,
    default: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
  },
  lastPurchaseRate: {
    type: Number,
    default: 0,
  },
  newPrice: {
    type: Number,
    default: 0,
  },
  lastUpdatedDate: {
    type: Date,
    default: null,
  },
  category: {
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

module.exports = mongoose.model('Item', itemSchema);
