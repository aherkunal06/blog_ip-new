import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
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

    const role = admin.role || (admin.isSuper ? 'super-admin' : 'admin');

    // Create JWT token with the same structure NextAuth uses
    const token = await encode({
      token: {
        sub: admin.id.toString(),
        name: admin.username,
        role: role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 60, // 30 minutes
    });

    // Create response with the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Session created successfully',
    });

    // Set the session cookie - use the same name NextAuth uses
    // Since we have basePath, NextAuth might use a different cookie name
    // But getToken should work with the default name
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutes
    });

    console.log('Session created for admin:', admin.username);

    return response;
  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create session' },
      { status: 500 }
    );
  }
}

