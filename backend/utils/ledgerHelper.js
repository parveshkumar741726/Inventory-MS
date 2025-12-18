const Ledger = require('../models/Ledger');
const Vendor = require('../models/Vendor');

const createLedgerEntry = async (vendorId, type, amount, reference, referenceId, description, date, userId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let debit = 0;
    let credit = 0;

    if (type === 'opening') {
      if (vendor.openingBalanceType === 'debit') {
        debit = vendor.openingBalance;
      } else {
        credit = vendor.openingBalance;
      }
    } else if (type === 'purchase') {
      debit = amount;
    } else if (type === 'payment') {
      credit = amount;
    } else if (type === 'adjustment') {
      if (amount >= 0) {
        debit = amount;
      } else {
        credit = Math.abs(amount);
      }
    }

    const ledgerEntry = await Ledger.create({
      vendor: vendorId,
      date: date || new Date(),
      type,
      reference,
      referenceId,
      debit,
      credit,
      description,
      createdBy: userId,
    });

    return ledgerEntry;
  } catch (error) {
    throw error;
  }
};

const calculateVendorBalance = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const ledgerEntries = await Ledger.find({ 
      vendor: vendorId,
      isDeleted: false 
    }).sort({ date: 1, createdAt: 1 });

    let balance = 0;
    
    ledgerEntries.forEach(entry => {
      balance += entry.debit - entry.credit;
    });

    return balance;
  } catch (error) {
    throw error;
  }
};

const getLedgerWithBalance = async (vendorId, filters = {}) => {
  try {
    const query = { vendor: vendorId, isDeleted: false, ...filters };
    const ledgerEntries = await Ledger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .populate('createdBy', 'name email');

    let runningBalance = 0;
    const entriesWithBalance = ledgerEntries.map(entry => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry.toObject(),
        runningBalance,
      };
    });

    return entriesWithBalance;
  } catch (error) {
    throw error;
  }
};

const createReverseEntry = async (originalEntryId, userId, reason) => {
  try {
    const originalEntry = await Ledger.findById(originalEntryId);
    if (!originalEntry) {
      throw new Error('Original entry not found');
    }

    originalEntry.isDeleted = true;
    originalEntry.deletedAt = new Date();
    originalEntry.deletedBy = userId;
    await originalEntry.save();

    const reverseEntry = await Ledger.create({
      vendor: originalEntry.vendor,
      date: new Date(),
      type: 'adjustment',
      reference: `Reversal of ${originalEntry.reference || originalEntry.type}`,
      referenceId: originalEntryId,
      debit: originalEntry.credit,
      credit: originalEntry.debit,
      description: reason || `Reversal: ${originalEntry.description}`,
      createdBy: userId,
    });

    return reverseEntry;
  } catch (error) {
    throw error;
  }
};

module.exports = { 
  createLedgerEntry, 
  calculateVendorBalance, 
  getLedgerWithBalance,
  createReverseEntry 
};
