const Vendor = require('../models/Vendor');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Item = require('../models/Item');
const Ledger = require('../models/Ledger');
const { calculateVendorBalance, getLedgerWithBalance } = require('../utils/ledgerHelper');

exports.getVendorReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const query = { isDeleted: false };
    
    if (status) {
      query.status = status;
    }

    const vendors = await Vendor.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email');

    const vendorReportData = await Promise.all(
      vendors.map(async (vendor) => {
        const balance = await calculateVendorBalance(vendor._id);
        
        const purchaseQuery = { vendor: vendor._id, isDeleted: false };
        if (startDate || endDate) {
          purchaseQuery.invoiceDate = {};
          if (startDate) purchaseQuery.invoiceDate.$gte = new Date(startDate);
          if (endDate) purchaseQuery.invoiceDate.$lte = new Date(endDate);
        }
        
        const purchases = await Purchase.find(purchaseQuery);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
        
        const paymentQuery = { vendor: vendor._id, isDeleted: false };
        if (startDate || endDate) {
          paymentQuery.paymentDate = {};
          if (startDate) paymentQuery.paymentDate.$gte = new Date(startDate);
          if (endDate) paymentQuery.paymentDate.$lte = new Date(endDate);
        }
        
        const payments = await Payment.find(paymentQuery);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        return {
          ...vendor.toObject(),
          currentBalance: balance,
          totalPurchases,
          totalPayments,
          purchaseCount: purchases.length,
          paymentCount: payments.length,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: vendorReportData,
      filters: { startDate, endDate, status },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPurchaseReport = async (req, res) => {
  try {
    const { vendor, startDate, endDate, status } = req.query;
    
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
      .populate('vendor')
      .populate('createdBy', 'name email');

    const summary = {
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + p.total, 0),
      totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
      totalPending: purchases.reduce((sum, p) => sum + p.pendingAmount, 0),
      totalTax: purchases.reduce((sum, p) => sum + p.totalTax, 0),
    };

    res.status(200).json({
      success: true,
      data: purchases,
      summary,
      filters: { vendor, startDate, endDate, status },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPaymentReport = async (req, res) => {
  try {
    const { vendor, startDate, endDate, paymentMode } = req.query;
    
    const query = { isDeleted: false };
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byMode: {
        cash: payments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0),
        upi: payments.filter(p => p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0),
        bank: payments.filter(p => p.paymentMode === 'bank').reduce((sum, p) => sum + p.amount, 0),
      },
    };

    res.status(200).json({
      success: true,
      data: payments,
      summary,
      filters: { vendor, startDate, endDate, paymentMode },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const { lowStock, category } = req.query;
    
    const query = { isDeleted: false };
    
    if (category) {
      query.category = category;
    }

    const items = await Item.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email');

    let filteredItems = items;
    
    if (lowStock === 'true') {
      filteredItems = items.filter(item => item.currentStock <= item.minStockLevel);
    }

    const summary = {
      totalItems: items.length,
      lowStockItems: items.filter(item => item.currentStock <= item.minStockLevel).length,
      totalStockValue: items.reduce((sum, item) => sum + (item.currentStock * item.lastPurchaseRate), 0),
    };

    res.status(200).json({
      success: true,
      data: filteredItems,
      summary,
      filters: { lowStock, category },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getLedgerReport = async (req, res) => {
  try {
    const { vendor, startDate, endDate, type } = req.query;
    
    const query = { isDeleted: false };
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const ledgerEntries = await Ledger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .populate('vendor')
      .populate('createdBy', 'name email');

    let runningBalance = 0;
    const entriesWithBalance = ledgerEntries.map(entry => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry.toObject(),
        runningBalance,
      };
    });

    const summary = {
      totalEntries: ledgerEntries.length,
      totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
      finalBalance: runningBalance,
    };

    res.status(200).json({
      success: true,
      data: entriesWithBalance,
      summary,
      filters: { vendor, startDate, endDate, type },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const startDate = new Date(year || new Date().getFullYear(), month ? month - 1 : 0, 1);
    const endDate = new Date(year || new Date().getFullYear(), month ? month : 12, 0);

    const purchases = await Purchase.find({
      invoiceDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    });

    const payments = await Payment.find({
      paymentDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    });

    const vendors = await Vendor.find({ isDeleted: false });
    const vendorsWithBalance = await Promise.all(
      vendors.map(async (vendor) => {
        const balance = await calculateVendorBalance(vendor._id);
        return { vendorId: vendor._id, name: vendor.name, balance };
      })
    );

    const summary = {
      period: { startDate, endDate },
      purchases: {
        count: purchases.length,
        total: purchases.reduce((sum, p) => sum + p.total, 0),
        paid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
        pending: purchases.reduce((sum, p) => sum + p.pendingAmount, 0),
      },
      payments: {
        count: payments.length,
        total: payments.reduce((sum, p) => sum + p.amount, 0),
        byMode: {
          cash: payments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0),
          upi: payments.filter(p => p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0),
          bank: payments.filter(p => p.paymentMode === 'bank').reduce((sum, p) => sum + p.amount, 0),
        },
      },
      vendors: {
        total: vendors.length,
        totalOutstanding: vendorsWithBalance.reduce((sum, v) => sum + v.balance, 0),
        topVendors: vendorsWithBalance.sort((a, b) => b.balance - a.balance).slice(0, 5),
      },
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = exports;
