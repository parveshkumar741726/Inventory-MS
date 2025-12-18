const Ledger = require('../models/Ledger');
const { getLedgerWithBalance } = require('../utils/ledgerHelper');

exports.getVendorLedger = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;
    
    const filters = {};

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    const ledgerEntriesWithBalance = await getLedgerWithBalance(vendorId, filters);

    res.status(200).json({
      success: true,
      data: ledgerEntriesWithBalance,
      count: ledgerEntriesWithBalance.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllLedgers = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const query = { isDeleted: false };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const ledgerEntries = await Ledger.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vendor')
      .populate('createdBy', 'name email');

    const count = await Ledger.countDocuments(query);

    res.status(200).json({
      success: true,
      data: ledgerEntries,
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
