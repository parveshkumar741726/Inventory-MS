const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');
const { createLedgerEntry, calculateVendorBalance } = require('../utils/ledgerHelper');
const { createAuditLog } = require('../utils/auditLogger');

exports.createPayment = async (req, res) => {
  try {
    const { vendor, purchase, amount, paymentMode, referenceNumber, paymentDate, notes } = req.body;

    const currentBalance = await calculateVendorBalance(vendor);
    
    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) cannot exceed pending balance (${currentBalance})`,
      });
    }

    const payment = await Payment.create({
      vendor,
      purchase: purchase || null,
      amount,
      paymentMode,
      referenceNumber,
      paymentDate: paymentDate || Date.now(),
      notes,
      createdBy: req.user._id,
    });

    if (purchase) {
      const purchaseDoc = await Purchase.findById(purchase);
      if (purchaseDoc) {
        purchaseDoc.paidAmount += amount;
        purchaseDoc.pendingAmount -= amount;
        
        if (purchaseDoc.pendingAmount <= 0) {
          purchaseDoc.status = 'paid';
          purchaseDoc.pendingAmount = 0;
        } else if (purchaseDoc.paidAmount > 0) {
          purchaseDoc.status = 'partial';
        }
        
        await purchaseDoc.save();
      }
    }

    await createLedgerEntry(
      vendor,
      'payment',
      amount,
      `Payment - ${paymentMode.toUpperCase()}`,
      payment._id,
      notes || `Payment via ${paymentMode}`,
      paymentDate || new Date(),
      req.user._id
    );

    await createAuditLog({
      user: req.user._id,
      action: 'create',
      entity: 'payment',
      entityId: payment._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Created payment: ${amount} via ${paymentMode}`,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { vendor, purchase, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { isDeleted: false };
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (purchase) {
      query.purchase = purchase;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    const count = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, isDeleted: false })
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
