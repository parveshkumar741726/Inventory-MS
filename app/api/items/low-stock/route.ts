import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Item from '@/backend/models/Item';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const items = await (Item as any).find({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }).sort({ currentStock: 1 });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
