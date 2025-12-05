import { NextRequest, NextResponse } from 'next/server';
import { blogGenerator } from '@/services/blogGenerator';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/article - Generate single article
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productIndexId, articleTitleId, regenerate, providerId } = body;

    if (!productIndexId || !articleTitleId) {
      return NextResponse.json(
        { error: 'productIndexId and articleTitleId are required' },
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

    // Generate article
    const blog = await blogGenerator.generateArticle(
      productIndexId,
      articleTitleId,
      providerConfig
    );

    return NextResponse.json({
      success: true,
      blogId: blog.blogId,
      status: 'completed',
      scores: {
        contentScore: blog.contentScore,
        seoScore: blog.seoScore,
        overall: Math.round((blog.contentScore + blog.seoScore) / 2),
      },
      hyperlinkCount: blog.hyperlinkCount,
    });
  } catch (error: any) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate article',
      },
      { status: 500 }
    );
  }
}

