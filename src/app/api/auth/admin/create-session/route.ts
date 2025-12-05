import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // Get admin user
    const admin = await queryOne<{
      id: number;
      username: string;
      status: string;
      isSuper: boolean;
      role: string;
    }>(
      'SELECT id, username, status, isSuper, role FROM AdminUser WHERE username = ?',
      [username]
    );

    if (!admin || admin.status !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'Admin not found or not approved' },
        { status: 404 }
      );
    }

    // Create session manually by calling NextAuth authorize
    // We'll use a different approach - set a session cookie directly
    // Actually, NextAuth doesn't expose a way to create sessions server-side
    // So we need to return success and let the client call signIn

    return NextResponse.json({
      success: true,
      message: 'Ready to create session',
      admin: {
        id: admin.id.toString(),
        username: admin.username,
        role: admin.role || (admin.isSuper ? 'super-admin' : 'admin'),
      },
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create session' },
      { status: 500 }
    );
  }
}

