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
    const totalPurchases = await (Purchase as any).countDocuments();

    const pendingPaymentsData = await (Purchase as any).aggregate([
      { $match: { status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
    ]);
    const pendingPayments = pendingPaymentsData[0]?.total || 0;

    const lowStockItems = await (Item as any).countDocuments({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    });

    const totalPurchaseAmount = await (Purchase as any).aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const totalPayments = await (Payment as any).aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const recentPurchases = await (Purchase as any).find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const recentPayments = await (Payment as any).find()
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    const monthlyPurchases = await (Purchase as any).aggregate([
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
