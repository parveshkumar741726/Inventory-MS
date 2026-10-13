import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/backend/models/User';
import { generateAccessToken, generateRefreshToken } from '@/backend/utils/generateToken';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { name, email, password, role } = await request.json();

    const userExists = await (User as any).findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      );
    }

    const user = await (User as any).create({
      name,
      email,
      password,
      role: role || 'staff',
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
