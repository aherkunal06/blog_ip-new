import { NextRequest, NextResponse } from 'next/server';
import { autoBlogService } from '@/services/autoBlogService';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/status - Get generation status for a product
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIndexId = searchParams.get('productIndexId');

    if (!productIndexId) {
      return NextResponse.json(
        { error: 'productIndexId is required' },
        { status: 400 }
      );
    }

    const status = await autoBlogService.getProductStatus(
      parseInt(productIndexId)
    );

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error getting generation status:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get generation status',
      },
      { status: 500 }
    );
  }
}

