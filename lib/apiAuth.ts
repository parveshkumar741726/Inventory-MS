import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from './dbConnect';
import User from '@/backend/models/User';

export interface AuthenticatedUser {
  _id: any;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export async function authenticateRequest(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<{ user: AuthenticatedUser | null; errorResponse: NextResponse | null }> {
  try {
    await dbConnect();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, message: 'Not authorized, no token provided' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'inventory_management_secret_key_2024';
    const decoded = jwt.verify(token, jwtSecret) as any;

    const user = await (User as any).findById(decoded.id).select('-password');
    if (!user) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 401 }
        ),
      };
    }

    if (!user.isActive) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, message: 'User account is inactive' },
          { status: 401 }
        ),
      };
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, message: `Role ${user.role} is not authorized` },
          { status: 403 }
        ),
      };
    }

    return { user, errorResponse: null };
  } catch (error: any) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, message: 'Not authorized, token invalid or expired' },
        { status: 401 }
      ),
    };
  }
}
