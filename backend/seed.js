const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Item = require('./models/Item');
const Purchase = require('./models/Purchase');
const PurchaseItem = require('./models/PurchaseItem');
const Payment = require('./models/Payment');
const Ledger = require('./models/Ledger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'inventory_management'
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await Item.deleteMany({});
    await Purchase.deleteMany({});
    await PurchaseItem.deleteMany({});
    await Payment.deleteMany({});
    await Ledger.deleteMany({});

    console.log('Creating users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    const staffUser = await User.create({
      name: 'Staff User',
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff',
    });

    console.log('Creating vendors...');
    const vendor1 = await Vendor.create({
      name: 'ABC Suppliers',
      phone: '9876543210',
      email: 'abc@suppliers.com',
      address: '123 Main Street, Business District, Mumbai',
      gstNumber: '27AABCU9603R1ZM',
      openingBalance: 50000,
      openingBalanceType: 'debit',
      status: 'active',
      createdBy: adminUser._id,
    });

    const vendor2 = await Vendor.create({
      name: 'XYZ Traders',
      phone: '9876543211',
      email: 'xyz@traders.com',
      address: '456 Market Road, Commercial Area, Delhi',
      gstNumber: '07AABCU9603R1ZN',
      openingBalance: 30000,
      openingBalanceType: 'debit',
      status: 'active',
      createdBy: adminUser._id,
    });

    const vendor3 = await Vendor.create({
      name: 'Global Electronics',
      phone: '9876543212',
      email: 'info@globalelectronics.com',
      address: '789 Tech Park, Bangalore',
      gstNumber: '29AABCU9603R1ZO',
      openingBalance: 75000,
      openingBalanceType: 'debit',
      status: 'active',
      createdBy: adminUser._id,
    });

    console.log('Creating opening balance ledger entries...');
    await Ledger.create([
      {
        vendor: vendor1._id,
        date: new Date('2024-01-01'),
        type: 'opening',
        reference: 'Opening Balance',
        debit: 50000,
        credit: 0,
        description: 'Opening balance entry',
        createdBy: adminUser._id,
      },
      {
        vendor: vendor2._id,
        date: new Date('2024-01-01'),
        type: 'opening',
        reference: 'Opening Balance',
        debit: 30000,
        credit: 0,
        description: 'Opening balance entry',
        createdBy: adminUser._id,
      },
      {
        vendor: vendor3._id,
        date: new Date('2024-01-01'),
        type: 'opening',
        reference: 'Opening Balance',
        debit: 75000,
        credit: 0,
        description: 'Opening balance entry',
        createdBy: adminUser._id,
      },
    ]);

    console.log('Creating items...');
    const item1 = await Item.create({
      name: 'Laptop Dell Inspiron',
      unit: 'Piece',
      currentStock: 0,
      minStockLevel: 5,
      category: 'Electronics',
      createdBy: adminUser._id,
    });

    const item2 = await Item.create({
      name: 'Office Chair Premium',
      unit: 'Piece',
      currentStock: 0,
      minStockLevel: 10,
      category: 'Furniture',
      createdBy: adminUser._id,
    });

    const item3 = await Item.create({
      name: 'A4 Paper Ream',
      unit: 'Box',
      currentStock: 0,
      minStockLevel: 20,
      category: 'Stationery',
      createdBy: adminUser._id,
    });

    const item4 = await Item.create({
      name: 'Wireless Mouse',
      unit: 'Piece',
      currentStock: 0,
      minStockLevel: 15,
      category: 'Electronics',
      createdBy: adminUser._id,
    });

    console.log('Creating purchases...');
    const purchase1 = await Purchase.create({
      vendor: vendor1._id,
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date('2024-01-15'),
      taxType: 'exclusive',
      subtotal: 100000,
      totalTax: 18000,
      total: 118000,
      paidAmount: 0,
      pendingAmount: 118000,
      status: 'pending',
      notes: 'Bulk order for laptops',
      createdBy: adminUser._id,
    });

    item1.currentStock += 10;
    item1.lastPurchaseRate = 10000;
    await item1.save();

    await PurchaseItem.create({
      purchase: purchase1._id,
      item: item1._id,
      itemName: item1.name,
      quantity: 10,
      unit: item1.unit,
      rate: 10000,
      taxPercent: 18,
      taxAmount: 18000,
      subtotal: 100000,
      total: 118000,
    });

    await Ledger.create({
      vendor: vendor1._id,
      date: new Date('2024-01-15'),
      type: 'purchase',
      reference: 'Invoice #INV-2024-001',
      referenceId: purchase1._id,
      debit: 118000,
      credit: 0,
      description: 'Purchase invoice #INV-2024-001',
      createdBy: adminUser._id,
    });

    const purchase2 = await Purchase.create({
      vendor: vendor2._id,
      invoiceNumber: 'INV-2024-002',
      invoiceDate: new Date('2024-01-20'),
      taxType: 'exclusive',
      subtotal: 45000,
      totalTax: 8100,
      total: 53100,
      paidAmount: 25000,
      pendingAmount: 28100,
      status: 'partial',
      notes: 'Office furniture order',
      createdBy: adminUser._id,
    });

    item2.currentStock += 15;
    item2.lastPurchaseRate = 3000;
    await item2.save();

    await PurchaseItem.create({
      purchase: purchase2._id,
      item: item2._id,
      itemName: item2.name,
      quantity: 15,
      unit: item2.unit,
      rate: 3000,
      taxPercent: 18,
      taxAmount: 8100,
      subtotal: 45000,
      total: 53100,
    });

    await Ledger.create({
      vendor: vendor2._id,
      date: new Date('2024-01-20'),
      type: 'purchase',
      reference: 'Invoice #INV-2024-002',
      referenceId: purchase2._id,
      debit: 53100,
      credit: 0,
      description: 'Purchase invoice #INV-2024-002',
      createdBy: adminUser._id,
    });

    console.log('Creating payments...');
    const payment1 = await Payment.create({
      vendor: vendor2._id,
      purchase: purchase2._id,
      amount: 25000,
      paymentMode: 'upi',
      referenceNumber: 'UPI123456789',
      paymentDate: new Date('2024-01-22'),
      notes: 'Partial payment for INV-2024-002',
      createdBy: adminUser._id,
    });

    await Ledger.create({
      vendor: vendor2._id,
      date: new Date('2024-01-22'),
      type: 'payment',
      reference: 'Payment - UPI',
      referenceId: payment1._id,
      debit: 0,
      credit: 25000,
      description: 'Partial payment for INV-2024-002',
      createdBy: adminUser._id,
    });

    const payment2 = await Payment.create({
      vendor: vendor1._id,
      amount: 50000,
      paymentMode: 'bank',
      referenceNumber: 'NEFT987654321',
      paymentDate: new Date('2024-01-25'),
      notes: 'Payment against opening balance',
      createdBy: adminUser._id,
    });

    await Ledger.create({
      vendor: vendor1._id,
      date: new Date('2024-01-25'),
      type: 'payment',
      reference: 'Payment - BANK',
      referenceId: payment2._id,
      debit: 0,
      credit: 50000,
      description: 'Payment against opening balance',
      createdBy: adminUser._id,
    });

    const purchase3 = await Purchase.create({
      vendor: vendor3._id,
      invoiceNumber: 'INV-2024-003',
      invoiceDate: new Date('2024-02-01'),
      taxType: 'inclusive',
      subtotal: 25423.73,
      totalTax: 4576.27,
      total: 30000,
      paidAmount: 30000,
      pendingAmount: 0,
      status: 'paid',
      notes: 'Stationery supplies - Tax Inclusive',
      createdBy: adminUser._id,
    });

    item3.currentStock += 100;
    item3.lastPurchaseRate = 250;
    await item3.save();

    item4.currentStock += 20;
    item4.lastPurchaseRate = 500;
    await item4.save();

    await PurchaseItem.create([
      {
        purchase: purchase3._id,
        item: item3._id,
        itemName: item3.name,
        quantity: 100,
        unit: item3.unit,
        rate: 250,
        taxPercent: 18,
        taxAmount: 3813.56,
        subtotal: 21186.44,
        total: 25000,
      },
      {
        purchase: purchase3._id,
        item: item4._id,
        itemName: item4.name,
        quantity: 20,
        unit: item4.unit,
        rate: 250,
        taxPercent: 18,
        taxAmount: 762.71,
        subtotal: 4237.29,
        total: 5000,
      },
    ]);

    await Ledger.create({
      vendor: vendor3._id,
      date: new Date('2024-02-01'),
      type: 'purchase',
      reference: 'Invoice #INV-2024-003',
      referenceId: purchase3._id,
      debit: 30000,
      credit: 0,
      description: 'Purchase invoice #INV-2024-003',
      createdBy: adminUser._id,
    });

    const payment3 = await Payment.create({
      vendor: vendor3._id,
      purchase: purchase3._id,
      amount: 30000,
      paymentMode: 'cash',
      paymentDate: new Date('2024-02-01'),
      notes: 'Full payment for INV-2024-003',
      createdBy: adminUser._id,
    });

    await Ledger.create({
      vendor: vendor3._id,
      date: new Date('2024-02-01'),
      type: 'payment',
      reference: 'Payment - CASH',
      referenceId: payment3._id,
      debit: 0,
      credit: 30000,
      description: 'Full payment for INV-2024-003',
      createdBy: adminUser._id,
    });

    console.log('\n✅ Seed data created successfully!\n');
    console.log('📊 Summary:');
    console.log('- Users: 2 (Admin + Staff)');
    console.log('- Vendors: 3');
    console.log('- Items: 4');
    console.log('- Purchases: 3');
    console.log('- Payments: 3');
    console.log('- Ledger Entries: 9\n');
    console.log('🔐 Login credentials:');
    console.log('Admin: admin@example.com / password123');
    console.log('Staff: staff@example.com / password123\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

connectDB().then(seedData);
