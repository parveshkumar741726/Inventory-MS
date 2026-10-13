import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { getLedgerWithBalance } from '@/backend/utils/ledgerHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters: any = {};

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    const ledgerEntriesWithBalance = await getLedgerWithBalance(params.vendorId, filters);

    return NextResponse.json({
      success: true,
      data: ledgerEntriesWithBalance,
      count: ledgerEntriesWithBalance.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
