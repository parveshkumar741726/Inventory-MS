import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Purchase from '@/backend/models/Purchase';
import PurchaseItem from '@/backend/models/PurchaseItem';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const purchase = await (Purchase as any).findOne({ _id: params.id, isDeleted: false })
      .populate('vendor')
      .populate('createdBy', 'name email');

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Purchase not found' },
        { status: 404 }
      );
    }

    const items = await (PurchaseItem as any).find({ purchase: purchase._id }).populate('item');

    return NextResponse.json({
      success: true,
      data: {
        purchase,
        items,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
