import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import User from '@/backend/models/User';

// Helper to extract user from JWT token in Authorization header
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  const user = await (User as any).findById(decoded.id).select('-password');
  if (!user || !user.isActive) return null;
  return user;
}

// POST /api/auth/logout
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 401 }
      );
    }

    const { refreshToken } = await request.json();

    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
    } else {
      user.refreshTokens = [];
    }

    await user.save();

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
