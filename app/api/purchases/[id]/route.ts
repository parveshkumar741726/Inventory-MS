import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Purchase from '@/backend/models/Purchase';
import PurchaseItem from '@/backend/models/PurchaseItem';
import Ledger from '@/backend/models/Ledger';
import Item from '@/backend/models/Item';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const purchase = await (Purchase as any).findOne({ _id: params.id, isDeleted: false });
    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Purchase not found' },
        { status: 404 }
      );
    }

    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body.notes = formData.get('notes');
      body.damageQuantity = parseFloat((formData.get('damageQuantity') as string) || '0');
      body.missingQuantity = parseFloat((formData.get('missingQuantity') as string) || '0');
      body.remark = formData.get('remark');
    } else {
      body = await request.json();
    }

    if (body.notes !== undefined) purchase.notes = body.notes;
    if (body.damageQuantity !== undefined) purchase.damageQuantity = body.damageQuantity;
    if (body.missingQuantity !== undefined) purchase.missingQuantity = body.missingQuantity;
    if (body.remark !== undefined) purchase.remark = body.remark;

    await purchase.save();

    return NextResponse.json({
      success: true,
      data: purchase,
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
    const purchase = await (Purchase as any).findOne({ _id: params.id, isDeleted: false });
    if (!purchase) {
      return NextResponse.json(
        { success: false, message: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Soft delete purchase
    purchase.isDeleted = true;
    purchase.deletedAt = new Date();
    purchase.deletedBy = user!._id;
    await purchase.save();

    // Revert associated ledger entry
    await (Ledger as any).updateMany(
      { referenceId: purchase._id },
      { isDeleted: true, deletedAt: new Date(), deletedBy: user!._id }
    );

    // Revert stock from items
    const purchaseItems = await (PurchaseItem as any).find({ purchase: purchase._id });
    for (const pItem of purchaseItems) {
      if (pItem.item) {
        await (Item as any).findByIdAndUpdate(pItem.item, {
          $inc: { currentStock: -pItem.quantity }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase deleted and stock reverted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
