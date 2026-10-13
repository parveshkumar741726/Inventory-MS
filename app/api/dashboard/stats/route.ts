import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Vendor from '@/backend/models/Vendor';
import Purchase from '@/backend/models/Purchase';
import Payment from '@/backend/models/Payment';
import Item from '@/backend/models/Item';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const totalVendors = await (Vendor as any).countDocuments({ status: 'active', isDeleted: false });
    const totalPurchases = await (Purchase as any).countDocuments({ isDeleted: false });

    // Calculate accurate pending payable balance across all vendors
    const vendors = await (Vendor as any).find({ isDeleted: false });
    const { calculateVendorBalance } = require('@/backend/utils/ledgerHelper');
    let totalPendingPayable = 0;
    for (const v of vendors) {
      const bal = await calculateVendorBalance(v._id);
      if (bal > 0) {
        totalPendingPayable += bal;
      }
    }

    const lowStockItems = await (Item as any).countDocuments({
      isDeleted: false,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    });

    const totalPurchaseAmountData = await (Purchase as any).aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalPurchaseAmount = totalPurchaseAmountData[0]?.total || 0;

    const totalPaymentsData = await (Payment as any).aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPayments = totalPaymentsData[0]?.total || 0;

    // Calculate exact total inventory value (stock * lastPurchaseRate)
    const inventoryValData = await (Item as any).aggregate([
      { $match: { isDeleted: false } },
      { $group: { 
          _id: null, 
          totalValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$lastPurchaseRate', 0] }] } },
          totalStockUnits: { $sum: '$currentStock' }
        } 
      }
    ]);
    const totalInventoryValue = Math.round(inventoryValData[0]?.totalValue || 0);
    const totalStockUnits = inventoryValData[0]?.totalStockUnits || 0;

    const recentPurchases = await (Purchase as any).find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const recentPayments = await (Payment as any).find({ isDeleted: false })
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const monthlyPurchases = await (Purchase as any).aggregate([
      { $match: { isDeleted: false } },
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

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalVendors,
          totalPurchases,
          pendingPayments: totalPendingPayable,
          lowStockItems,
          totalPurchaseAmount,
          totalPayments,
          totalInventoryValue,
          totalStockUnits,
        },
        recentPurchases,
        recentPayments,
        monthlyPurchases,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
