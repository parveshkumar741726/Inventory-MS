import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Item from '@/backend/models/Item';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }

    const items = await (Item as any).find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const count = await (Item as any).countDocuments(query);

    return NextResponse.json({
      success: true,
      data: items,
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
    let { stockId, name, unit, minStockLevel } = body;

    if (!stockId) {
      let isUnique = false;
      while (!isUnique) {
        stockId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingItem = await (Item as any).findOne({ stockId });
        if (!existingItem) {
          isUnique = true;
        }
      }
    }

    const item = await (Item as any).create({
      stockId,
      name,
      unit,
      minStockLevel: minStockLevel || 10,
      createdBy: user!._id,
    });

    return NextResponse.json({
      success: true,
      data: item,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
