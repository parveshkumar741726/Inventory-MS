import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Item from '@/backend/models/Item';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const item = await (Item as any).findById(params.id);

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      stockId,
      name,
      unit,
      minStockLevel,
      currentStock,
      lastPurchaseRate,
      newPrice,
      category,
      lastUpdatedDate,
    } = body;

    let item = await (Item as any).findById(params.id);

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (stockId !== undefined) updateData.stockId = stockId;
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;
    if (currentStock !== undefined) updateData.currentStock = currentStock;
    if (lastPurchaseRate !== undefined) updateData.lastPurchaseRate = lastPurchaseRate;
    if (newPrice !== undefined) updateData.newPrice = newPrice;
    if (category !== undefined) updateData.category = category;
    if (lastUpdatedDate !== undefined) updateData.lastUpdatedDate = lastUpdatedDate;

    item = await (Item as any).findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const item = await (Item as any).findById(params.id);
    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = user!._id;
    await item.save();

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
