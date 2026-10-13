import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Purchase from '@/backend/models/Purchase';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const totalPurchases = await (Purchase as any).countDocuments({ isDeleted: false });
    const pendingPayments = await (Purchase as any).aggregate([
      { $match: { status: { $in: ['pending', 'partial'] }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
    ]);

    const totalPurchaseAmount = await (Purchase as any).aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalPurchases,
        pendingPayments: pendingPayments[0]?.total || 0,
        totalPurchaseAmount: totalPurchaseAmount[0]?.total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
