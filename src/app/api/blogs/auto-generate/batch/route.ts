import { NextRequest, NextResponse } from 'next/server';
import { autoBlogService } from '@/services/autoBlogService';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/batch - Batch generate for multiple products
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      productIds,
      limit,
      skipExisting,
      generateTitles,
      generateArticles,
      providerId,
    } = body;

    // Get provider config if specified
    let providerConfig;
    if (providerId) {
      providerConfig = await AIProviderFactory.getProviderById(providerId);
      if (!providerConfig) {
        return NextResponse.json(
          { error: 'AI provider not found' },
          { status: 404 }
        );
      }
    }

    // Start batch generation (run in background)
    autoBlogService
      .batchGenerate(productIds || [], {
        generateTitles: generateTitles !== false,
        generateArticles: generateArticles !== false,
        skipExisting: skipExisting !== false,
        limit,
        providerConfig,
      })
      .catch((error) => {
        console.error('Background batch generation error:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Batch generation started',
      status: 'processing',
    });
  } catch (error: any) {
    console.error('Error starting batch generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start batch generation',
      },
      { status: 500 }
    );
  }
}

