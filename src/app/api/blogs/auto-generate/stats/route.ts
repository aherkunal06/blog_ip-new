import { NextRequest, NextResponse } from 'next/server';
import { autoBlogService } from '@/services/autoBlogService';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/stats - Get generation statistics
export async function GET(req: NextRequest) {
  try {
    const stats = await autoBlogService.getStatistics();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error getting generation statistics:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get statistics',
      },
      { status: 500 }
    );
  }
}

