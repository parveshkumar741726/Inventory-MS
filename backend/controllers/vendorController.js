const Vendor = require('../models/Vendor');
const { createLedgerEntry, calculateVendorBalance } = require('../utils/ledgerHelper');
const { createAuditLog } = require('../utils/auditLogger');

exports.createVendor = async (req, res) => {
  try {
    const { name, firmName, phone, email, address, gstNumber, openingBalance, openingBalanceType, status } = req.body;

    const vendor = await Vendor.create({
      name,
      firmName,
      phone,
      email,
      address,
      gstNumber,
      openingBalance: openingBalance || 0,
      openingBalanceType: openingBalanceType || 'debit',
      status: status || 'active',
      createdBy: req.user._id,
    });

    if (openingBalance && openingBalance !== 0) {
      await createLedgerEntry(
        vendor._id,
        'opening',
        openingBalance,
        'Opening Balance',
        null,
        'Opening balance entry',
        new Date(),
        req.user._id
      );
    }

    await createAuditLog({
      user: req.user._id,
      action: 'create',
      entity: 'vendor',
      entityId: vendor._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Created vendor: ${vendor.name}`,
    });

    const balance = await calculateVendorBalance(vendor._id);

    res.status(201).json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    
    const query = { isDeleted: false };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email');

    const vendorsWithBalance = await Promise.all(
      vendors.map(async (vendor) => {
        const balance = await calculateVendorBalance(vendor._id);
        return { ...vendor.toObject(), currentBalance: balance };
      })
    );

    const count = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: vendorsWithBalance,
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

exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, isDeleted: false })
      .populate('createdBy', 'name email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const balance = await calculateVendorBalance(vendor._id);

    res.status(200).json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { name, firmName, phone, email, address, gstNumber, status } = req.body;

    let vendor = await Vendor.findOne({ _id: req.params.id, isDeleted: false });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const oldData = { ...vendor.toObject() };

    vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { name, firmName, phone, email, address, gstNumber, status },
      { new: true, runValidators: true }
    );

    await createAuditLog({
      user: req.user._id,
      action: 'update',
      entity: 'vendor',
      entityId: vendor._id,
      changes: { old: oldData, new: vendor.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Updated vendor: ${vendor.name}`,
    });

    const balance = await calculateVendorBalance(vendor._id);

    res.status(200).json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, isDeleted: false });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    vendor.deletedBy = req.user._id;
    await vendor.save();

    await createAuditLog({
      user: req.user._id,
      action: 'delete',
      entity: 'vendor',
      entityId: vendor._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Deleted vendor: ${vendor.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendorStats = async (req, res) => {
  try {
    const totalVendors = await Vendor.countDocuments({ status: 'active', isDeleted: false });
    const inactiveVendors = await Vendor.countDocuments({ status: 'inactive', isDeleted: false });

    res.status(200).json({
      success: true,
      data: {
        totalVendors,
        activeVendors: totalVendors,
        inactiveVendors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
