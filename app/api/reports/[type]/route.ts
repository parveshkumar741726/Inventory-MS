import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Vendor from '@/backend/models/Vendor';
import Purchase from '@/backend/models/Purchase';
import Payment from '@/backend/models/Payment';
import Item from '@/backend/models/Item';
import Ledger from '@/backend/models/Ledger';
import { calculateVendorBalance } from '@/backend/utils/ledgerHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  const searchParams = request.nextUrl.searchParams;
  const reportType = params.type;

  try {
    if (reportType === 'vendors') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const status = searchParams.get('status');

      const query: any = { isDeleted: false };
      if (status) query.status = status;

      const vendors = await (Vendor as any).find(query)
        .sort({ name: 1 })
        .populate('createdBy', 'name email');

      const vendorReportData = await Promise.all(
        vendors.map(async (vendor: any) => {
          const balance = await calculateVendorBalance(vendor._id);

          const purchaseQuery: any = { vendor: vendor._id, isDeleted: false };
          if (startDate || endDate) {
            purchaseQuery.invoiceDate = {};
            if (startDate) purchaseQuery.invoiceDate.$gte = new Date(startDate);
            if (endDate) purchaseQuery.invoiceDate.$lte = new Date(endDate);
          }

          const purchases = await (Purchase as any).find(purchaseQuery);
          const totalPurchases = purchases.reduce((sum: number, p: any) => sum + p.total, 0);

          const paymentQuery: any = { vendor: vendor._id, isDeleted: false };
          if (startDate || endDate) {
            paymentQuery.paymentDate = {};
            if (startDate) paymentQuery.paymentDate.$gte = new Date(startDate);
            if (endDate) paymentQuery.paymentDate.$lte = new Date(endDate);
          }

          const payments = await (Payment as any).find(paymentQuery);
          const totalPayments = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

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

      return NextResponse.json({
        success: true,
        data: vendorReportData,
        filters: { startDate, endDate, status },
      });
    }

    if (reportType === 'purchases') {
      const vendor = searchParams.get('vendor');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const status = searchParams.get('status');

      const query: any = { isDeleted: false };
      if (vendor) query.vendor = vendor;
      if (status) query.status = status;

      if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) query.invoiceDate.$lte = new Date(endDate);
      }

      const purchases = await (Purchase as any).find(query)
        .sort({ invoiceDate: -1 })
        .populate('vendor')
        .populate('createdBy', 'name email');

      const summary = {
        totalPurchases: purchases.length,
        totalAmount: purchases.reduce((sum: number, p: any) => sum + p.total, 0),
        totalPaid: purchases.reduce((sum: number, p: any) => sum + p.paidAmount, 0),
        totalPending: purchases.reduce((sum: number, p: any) => sum + p.pendingAmount, 0),
        totalTax: purchases.reduce((sum: number, p: any) => sum + p.totalTax, 0),
      };

      return NextResponse.json({
        success: true,
        data: purchases,
        summary,
        filters: { vendor, startDate, endDate, status },
      });
    }

    if (reportType === 'payments') {
      const vendor = searchParams.get('vendor');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const paymentMode = searchParams.get('paymentMode');

      const query: any = { isDeleted: false };
      if (vendor) query.vendor = vendor;
      if (paymentMode) query.paymentMode = paymentMode;

      if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) query.paymentDate.$lte = new Date(endDate);
      }

      const payments = await (Payment as any).find(query)
        .sort({ paymentDate: -1 })
        .populate('vendor')
        .populate('purchase')
        .populate('createdBy', 'name email');

      const summary = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum: number, p: any) => sum + p.amount, 0),
        byMode: {
          cash: payments.filter((p: any) => p.paymentMode === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0),
          upi: payments.filter((p: any) => p.paymentMode === 'upi').reduce((sum: number, p: any) => sum + p.amount, 0),
          bank: payments.filter((p: any) => p.paymentMode === 'bank').reduce((sum: number, p: any) => sum + p.amount, 0),
        },
      };

      return NextResponse.json({
        success: true,
        data: payments,
        summary,
        filters: { vendor, startDate, endDate, paymentMode },
      });
    }

    if (reportType === 'inventory') {
      const lowStock = searchParams.get('lowStock');
      const category = searchParams.get('category');

      const query: any = { isDeleted: false };
      if (category) query.category = category;

      const items = await (Item as any).find(query)
        .sort({ name: 1 })
        .populate('createdBy', 'name email');

      let filteredItems = items;
      if (lowStock === 'true') {
        filteredItems = items.filter((item: any) => item.currentStock <= item.minStockLevel);
      }

      const summary = {
        totalItems: items.length,
        lowStockItems: items.filter((item: any) => item.currentStock <= item.minStockLevel).length,
        totalStockValue: items.reduce((sum: number, item: any) => sum + (item.currentStock * item.lastPurchaseRate), 0),
      };

      return NextResponse.json({
        success: true,
        data: filteredItems,
        summary,
        filters: { lowStock, category },
      });
    }

    if (reportType === 'ledger') {
      const vendor = searchParams.get('vendor');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const type = searchParams.get('type');

      const query: any = { isDeleted: false };
      if (vendor) query.vendor = vendor;
      if (type) query.type = type;

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const ledgerEntries = await (Ledger as any).find(query)
        .sort({ date: 1, createdAt: 1 })
        .populate('vendor')
        .populate('createdBy', 'name email');

      let runningBalance = 0;
      const entriesWithBalance = ledgerEntries.map((entry: any) => {
        runningBalance += entry.credit - entry.debit;
        return {
          ...entry.toObject(),
          runningBalance,
        };
      });

      const summary = {
        totalEntries: ledgerEntries.length,
        totalDebit: ledgerEntries.reduce((sum: number, e: any) => sum + e.debit, 0),
        totalCredit: ledgerEntries.reduce((sum: number, e: any) => sum + e.credit, 0),
        finalBalance: runningBalance,
      };

      return NextResponse.json({
        success: true,
        data: entriesWithBalance,
        summary,
        filters: { vendor, startDate, endDate, type },
      });
    }

    if (reportType === 'monthly-summary' || reportType === 'monthly') {
      const year = searchParams.get('year');
      const monthStr = searchParams.get('month');
      const month = monthStr ? parseInt(monthStr) : undefined;

      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      const startDate = new Date(currentYear, month ? month - 1 : 0, 1);
      const endDate = new Date(currentYear, month ? month : 12, 0);

      const purchases = await (Purchase as any).find({
        invoiceDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      });

      const payments = await (Payment as any).find({
        paymentDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      });

      const vendors = await (Vendor as any).find({ isDeleted: false });
      const vendorsWithBalance = await Promise.all(
        vendors.map(async (v: any) => {
          const balance = await calculateVendorBalance(v._id);
          return { vendorId: v._id, name: v.name, balance };
        })
      );

      const summary = {
        period: { startDate, endDate },
        purchases: {
          count: purchases.length,
          total: purchases.reduce((sum: number, p: any) => sum + p.total, 0),
          paid: purchases.reduce((sum: number, p: any) => sum + p.paidAmount, 0),
          pending: purchases.reduce((sum: number, p: any) => sum + p.pendingAmount, 0),
        },
        payments: {
          count: payments.length,
          total: payments.reduce((sum: number, p: any) => sum + p.amount, 0),
          byMode: {
            cash: payments.filter((p: any) => p.paymentMode === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0),
            upi: payments.filter((p: any) => p.paymentMode === 'upi').reduce((sum: number, p: any) => sum + p.amount, 0),
            bank: payments.filter((p: any) => p.paymentMode === 'bank').reduce((sum: number, p: any) => sum + p.amount, 0),
          },
        },
        vendors: {
          total: vendors.length,
          totalOutstanding: vendorsWithBalance.reduce((sum: number, v: any) => sum + v.balance, 0),
          topVendors: vendorsWithBalance.sort((a: any, b: any) => b.balance - a.balance).slice(0, 5),
        },
      };

      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    return NextResponse.json(
      { success: false, message: `Report type '${reportType}' not found` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
