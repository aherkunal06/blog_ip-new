import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/admin/[...nextauth]/route';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get admin user details from database
    const admin = await queryOne<{
      name: string;
      email: string;
    }>(
      'SELECT name, email FROM AdminUser WHERE username = ?',
      [session.user.name]
    );

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: admin.name || session.user.name,
      email: admin.email,
    });
  } catch (error) {
    console.error('User info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}

