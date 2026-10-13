import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Payment from '@/backend/models/Payment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const payment = await (Payment as any).findOne({ _id: params.id, isDeleted: false })
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
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
    const payment = await (Payment as any).findOne({ _id: params.id, isDeleted: false });
    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    // Revert purchase paid / pending amount if linked
    if (payment.purchase) {
      const Purchase = require('@/backend/models/Purchase');
      const purchase = await Purchase.findById(payment.purchase);
      if (purchase) {
        purchase.paidAmount = Math.max(0, purchase.paidAmount - payment.amount);
        purchase.pendingAmount += payment.amount;
        if (purchase.paidAmount === 0) {
          purchase.status = 'pending';
        } else {
          purchase.status = 'partial';
        }
        await purchase.save();
      }
    }

    // Soft delete payment
    payment.isDeleted = true;
    payment.deletedAt = new Date();
    payment.deletedBy = user!._id;
    await payment.save();

    // Soft delete associated ledger entry
    const Ledger = require('@/backend/models/Ledger');
    await Ledger.updateMany(
      { referenceId: payment._id },
      { isDeleted: true, deletedAt: new Date(), deletedBy: user!._id }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment deleted and balance reverted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
