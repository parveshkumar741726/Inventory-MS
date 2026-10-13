import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Vendor from '@/backend/models/Vendor';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const totalVendors = await (Vendor as any).countDocuments({ status: 'active', isDeleted: false });
    const inactiveVendors = await (Vendor as any).countDocuments({ status: 'inactive', isDeleted: false });

    return NextResponse.json({
      success: true,
      data: {
        totalVendors,
        activeVendors: totalVendors,
        inactiveVendors,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
