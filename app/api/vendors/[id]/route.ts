import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Vendor from '@/backend/models/Vendor';
import { calculateVendorBalance } from '@/backend/utils/ledgerHelper';
import { createAuditLog } from '@/backend/utils/auditLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const vendor = await (Vendor as any).findOne({ _id: params.id, isDeleted: false })
      .populate('createdBy', 'name email');

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const balance = await calculateVendorBalance(vendor._id);

    return NextResponse.json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
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
    const { name, firmName, phone, email, address, gstNumber, status } = body;

    let vendor = await (Vendor as any).findOne({ _id: params.id, isDeleted: false });

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const oldData = { ...vendor.toObject() };

    vendor = await (Vendor as any).findByIdAndUpdate(
      params.id,
      { name, firmName, phone, email, address, gstNumber, status },
      { new: true, runValidators: true }
    );

    await (createAuditLog as any)({
      user: user!._id,
      action: 'update',
      entity: 'vendor',
      entityId: vendor._id,
      changes: { old: oldData, new: vendor.toObject() },
      description: `Updated vendor: ${vendor.name}`,
    });

    const balance = await calculateVendorBalance(vendor._id);

    return NextResponse.json({
      success: true,
      data: { ...vendor.toObject(), currentBalance: balance },
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
    const vendor = await (Vendor as any).findOne({ _id: params.id, isDeleted: false });

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    vendor.deletedBy = user!._id;
    await vendor.save();

    await (createAuditLog as any)({
      user: user!._id,
      action: 'delete',
      entity: 'vendor',
      entityId: vendor._id,
      description: `Deleted vendor: ${vendor.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
