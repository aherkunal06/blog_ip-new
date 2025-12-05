import { NextRequest, NextResponse } from 'next/server';
import { autoBlogService } from '@/services/autoBlogService';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/product - Generate all articles for a product
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      productIndexId,
      regenerateTitles,
      regenerateArticles,
      skipExisting,
      providerId,
    } = body;

    if (!productIndexId) {
      return NextResponse.json(
        { error: 'productIndexId is required' },
        { status: 400 }
      );
    }

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

    // Generate all articles
    const result = await autoBlogService.generateAllForProduct(productIndexId, {
      regenerateTitles: regenerateTitles || false,
      regenerateArticles: regenerateArticles || false,
      skipExisting: skipExisting !== false, // Default true
      providerConfig,
    });

    return NextResponse.json({
      success: result.status !== 'failed',
      productIndexId: result.productIndexId,
      productName: result.productName,
      titlesGenerated: result.titlesGenerated,
      articlesGenerated: result.articlesGenerated,
      totalHyperlinks: result.totalHyperlinks,
      results: result.results,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error('Error generating articles for product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate articles',
      },
      { status: 500 }
    );
  }
}

