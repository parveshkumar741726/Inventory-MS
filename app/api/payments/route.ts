import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Payment from '@/backend/models/Payment';
import Purchase from '@/backend/models/Purchase';
import { createLedgerEntry, calculateVendorBalance } from '@/backend/utils/ledgerHelper';
import { createAuditLog } from '@/backend/utils/auditLogger';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const vendor = searchParams.get('vendor');
    const purchase = searchParams.get('purchase');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = { isDeleted: false };

    if (vendor) query.vendor = vendor;
    if (purchase) query.purchase = purchase;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await (Payment as any).find(query)
      .sort({ paymentDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    const count = await (Payment as any).countDocuments(query);

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      vendor,
      purchase,
      amount,
      paymentMode,
      referenceNumber,
      paymentDate,
      notes,
    } = body;

    const payment = await (Payment as any).create({
      vendor,
      purchase: purchase || null,
      amount,
      paymentMode,
      referenceNumber,
      paymentDate: paymentDate || Date.now(),
      notes,
      createdBy: user!._id,
    });

    if (purchase) {
      const purchaseDoc = await (Purchase as any).findById(purchase);
      if (purchaseDoc) {
        purchaseDoc.paidAmount += amount;
        purchaseDoc.pendingAmount -= amount;

        if (purchaseDoc.pendingAmount <= 0) {
          purchaseDoc.status = 'paid';
          purchaseDoc.pendingAmount = 0;
        } else if (purchaseDoc.paidAmount > 0) {
          purchaseDoc.status = 'partial';
        }

        await purchaseDoc.save();
      }
    }

    await createLedgerEntry(
      vendor,
      'payment',
      amount,
      `Payment - ${paymentMode.toUpperCase()}`,
      payment._id,
      notes || `Payment via ${paymentMode}`,
      paymentDate || new Date(),
      user!._id
    );

    await (createAuditLog as any)({
      user: user!._id,
      action: 'create',
      entity: 'payment',
      entityId: payment._id,
      description: `Created payment: ${amount} via ${paymentMode}`,
    });

    const populatedPayment = await (Payment as any).findById(payment._id)
      .populate('vendor')
      .populate('purchase')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: populatedPayment,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
