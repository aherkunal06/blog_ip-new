import { NextRequest, NextResponse } from 'next/server';
import { articleTitleGenerator } from '@/services/articleTitleGenerator';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/titles - Generate article titles for a product
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productIndexId, regenerate, providerId } = body;

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

    // Generate titles
    const titles = await articleTitleGenerator.generateTitles(
      productIndexId,
      providerConfig
    );

    return NextResponse.json({
      success: true,
      productIndexId,
      titles: titles.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        articleNumber: t.articleNumber,
        seoScore: t.seoScore,
      })),
    });
  } catch (error: any) {
    console.error('Error generating article titles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate article titles',
      },
      { status: 500 }
    );
  }
}

