const Vendor = require('../models/Vendor');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Item = require('../models/Item');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalVendors = await Vendor.countDocuments({ status: 'active' });
    
    const totalPurchases = await Purchase.countDocuments();
    
    const pendingPaymentsData = await Purchase.aggregate([
      { $match: { status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
    ]);
    const pendingPayments = pendingPaymentsData[0]?.total || 0;
    
    const lowStockItems = await Item.countDocuments({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    });

    const totalPurchaseAmount = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const totalPayments = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const recentPurchases = await Purchase.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const recentPayments = await Payment.find()
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const monthlyPurchases = await Purchase.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalVendors,
          totalPurchases,
          pendingPayments,
          lowStockItems,
          totalPurchaseAmount: totalPurchaseAmount[0]?.total || 0,
          totalPayments: totalPayments[0]?.total || 0,
        },
        recentPurchases,
        recentPayments,
        monthlyPurchases,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
