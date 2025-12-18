const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const Item = require('../models/Item');
const Vendor = require('../models/Vendor');
const { createLedgerEntry } = require('../utils/ledgerHelper');
const { createAuditLog } = require('../utils/auditLogger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

exports.createPurchase = async (req, res) => {
  try {
    const { vendor, invoiceNumber, invoiceDate, items, taxType, notes, damageQuantity, missingQuantity, remark } = req.body;

    let subtotal = 0;
    let totalTax = 0;

    const parsedItems = JSON.parse(items);
    const purchaseTaxType = taxType || 'exclusive';

    parsedItems.forEach(item => {
      if (purchaseTaxType === 'inclusive') {
        const itemTotal = item.quantity * item.rate;
        const itemSubtotal = itemTotal / (1 + item.taxPercent / 100);
        const itemTax = itemTotal - itemSubtotal;
        subtotal += itemSubtotal;
        totalTax += itemTax;
      } else {
        const itemSubtotal = item.quantity * item.rate;
        const itemTax = (itemSubtotal * item.taxPercent) / 100;
        subtotal += itemSubtotal;
        totalTax += itemTax;
      }
    });

    const total = purchaseTaxType === 'inclusive' ? subtotal + totalTax : subtotal + totalTax;

    let invoiceFile = {};
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'invoices',
        resource_type: 'auto',
      });
      invoiceFile = {
        url: result.secure_url,
        publicId: result.public_id,
      };
      fs.unlinkSync(req.file.path);
    }

    const purchase = await Purchase.create({
      vendor,
      invoiceNumber,
      invoiceDate,
      invoiceFile,
      taxType: purchaseTaxType,
      subtotal,
      totalTax,
      total,
      pendingAmount: total,
      notes,
      damageQuantity: damageQuantity || 0,
      missingQuantity: missingQuantity || 0,
      remark: remark || '',
      createdBy: req.user._id,
    });

    for (const itemData of parsedItems) {
      let item = await Item.findOne({ name: itemData.itemName, isDeleted: false });
      
      if (!item) {
        item = await Item.create({
          name: itemData.itemName,
          unit: itemData.unit,
          currentStock: 0,
          createdBy: req.user._id,
        });
      }

      item.currentStock += itemData.quantity;
      item.lastPurchaseRate = itemData.rate;
      await item.save();

      let itemSubtotal, itemTax, itemTotal;
      
      if (purchaseTaxType === 'inclusive') {
        itemTotal = itemData.quantity * itemData.rate;
        itemSubtotal = itemTotal / (1 + itemData.taxPercent / 100);
        itemTax = itemTotal - itemSubtotal;
      } else {
        itemSubtotal = itemData.quantity * itemData.rate;
        itemTax = (itemSubtotal * itemData.taxPercent) / 100;
        itemTotal = itemSubtotal + itemTax;
      }

      await PurchaseItem.create({
        purchase: purchase._id,
        item: item._id,
        itemName: itemData.itemName,
        quantity: itemData.quantity,
        unit: itemData.unit,
        rate: itemData.rate,
        taxPercent: itemData.taxPercent,
        taxAmount: itemTax,
        subtotal: itemSubtotal,
        total: itemTotal,
      });
    }

    await createLedgerEntry(
      vendor,
      'purchase',
      total,
      `Invoice #${invoiceNumber}`,
      purchase._id,
      `Purchase invoice #${invoiceNumber}`,
      invoiceDate,
      req.user._id
    );

    await createAuditLog({
      user: req.user._id,
      action: 'create',
      entity: 'purchase',
      entityId: purchase._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Created purchase: Invoice #${invoiceNumber}`,
    });

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('vendor')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedPurchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const { vendor, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { isDeleted: false };
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query)
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vendor')
      .populate('createdBy', 'name email');

    const count = await Purchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: purchases,
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

exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, isDeleted: false })
      .populate('vendor')
      .populate('createdBy', 'name email');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found',
      });
    }

    const items = await PurchaseItem.find({ purchase: purchase._id }).populate('item');

    res.status(200).json({
      success: true,
      data: {
        purchase,
        items,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPurchaseStats = async (req, res) => {
  try {
    const totalPurchases = await Purchase.countDocuments({ isDeleted: false });
    const pendingPayments = await Purchase.aggregate([
      { $match: { status: { $in: ['pending', 'partial'] }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
    ]);

    const totalPurchaseAmount = await Purchase.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPurchases,
        pendingPayments: pendingPayments[0]?.total || 0,
        totalPurchaseAmount: totalPurchaseAmount[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
