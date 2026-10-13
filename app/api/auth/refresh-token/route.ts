import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import User from '@/backend/models/User';
import { generateAccessToken } from '@/backend/utils/generateToken';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token required' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    const user = await (User as any).findById(decoded.id);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const tokenExists = user.refreshTokens.includes(refreshToken);
    if (!tokenExists) {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const newAccessToken = generateAccessToken(user._id);

    return NextResponse.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
