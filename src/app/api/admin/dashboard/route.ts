import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total blogs count
    const totalBlogs = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Blog'
    );

    // Get approved blogs count
    const approvedBlogs = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Blog WHERE status = 1'
    );

    // Get pending blogs count
    const pendingBlogs = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Blog WHERE status = 0'
    );

    // Get total categories count
    const totalCategories = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Category'
    );

    return NextResponse.json({
      totalBlogs: Number(totalBlogs?.count || 0),
      approvedBlogs: Number(approvedBlogs?.count || 0),
      pendingBlogs: Number(pendingBlogs?.count || 0),
      totalCategories: Number(totalCategories?.count || 0),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

