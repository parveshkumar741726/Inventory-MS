import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Ledger from '@/backend/models/Ledger';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = { isDeleted: false };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const allMatchingEntries = await (Ledger as any).find(query)
      .sort({ date: 1, createdAt: 1 })
      .populate('vendor')
      .populate('createdBy', 'name email');

    const vendorBalances: Record<string, number> = {};
    let cumulativeBalance = 0;

    const entriesWithBalance = allMatchingEntries.map((entry: any) => {
      const cr = entry.credit || 0;
      const dr = entry.debit || 0;
      cumulativeBalance += (cr - dr);
      
      const vId = entry.vendor?._id?.toString() || 'unknown';
      vendorBalances[vId] = (vendorBalances[vId] || 0) + (cr - dr);

      return {
        ...entry.toObject(),
        runningBalance: vendorBalances[vId],
        cumulativeBalance,
      };
    });

    const count = allMatchingEntries.length;
    const sortedEntries = [...entriesWithBalance].reverse();
    const paginatedEntries = sortedEntries.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: paginatedEntries,
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
