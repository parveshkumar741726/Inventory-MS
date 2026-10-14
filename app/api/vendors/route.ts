import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Vendor from '@/backend/models/Vendor';
import { createLedgerEntry, calculateVendorBalance } from '@/backend/utils/ledgerHelper';
import { createAuditLog } from '@/backend/utils/auditLogger';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const vendors = await (Vendor as any).find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email');

    const vendorsWithBalance = await Promise.all(
      vendors.map(async (vendor: any) => {
        const balance = await calculateVendorBalance(vendor._id);
        return { ...vendor.toObject(), currentBalance: balance };
      })
    );

    const count = await (Vendor as any).countDocuments(query);

    return NextResponse.json({
      success: true,
      data: vendorsWithBalance,
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
      name,
      firmName,
      phone,
      email,
      address,
      gstNumber,
      openingBalance,
      openingBalanceType,
      status,
    } = body;

    const vendor = await (Vendor as any).create({
      name,
      firmName,
      phone,
      email,
      address,
      gstNumber,
      openingBalance: openingBalance || 0,
      openingBalanceType: openingBalanceType || 'credit',
      status: status || 'active',
      createdBy: user!._id,
    });

    if (openingBalance && openingBalance !== 0) {
      await createLedgerEntry(
        vendor._id,
        'opening',
        openingBalance,
        'Opening Balance',
        null,
        'Opening balance entry',
        new Date(),
        user!._id
      );
    }

    await (createAuditLog as any)({
      user: user!._id,
      action: 'create',
      entity: 'vendor',
      entityId: vendor._id,
      description: `Created vendor: ${vendor.name}`,
    });

    const balance = await calculateVendorBalance(vendor._id);

    return NextResponse.json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
