import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { queryOne } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/ai-providers/[id]/test - Test AI provider connection
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providerId = parseInt(params.id);

    if (isNaN(providerId)) {
      return NextResponse.json(
        { error: 'Invalid provider ID' },
        { status: 400 }
      );
    }

    const provider = await queryOne(
      `SELECT * FROM AIProviderConfig WHERE id = ?`,
      [providerId]
    );

    if (!provider) {
      return NextResponse.json(
        { error: 'AI provider not found' },
        { status: 404 }
      );
    }

    const providerConfig = {
      id: provider.id,
      providerName: provider.providerName,
      apiKey: provider.apiKey,
      apiSecret: provider.apiSecret || undefined,
      modelName: provider.modelName,
      temperature: Number(provider.temperature),
      maxTokens: provider.maxTokens,
      rateLimitPerMinute: provider.rateLimitPerMinute,
      isActive: Boolean(provider.isActive),
      isDefault: Boolean(provider.isDefault),
      costPerToken: provider.costPerToken ? Number(provider.costPerToken) : undefined,
    };

    const result = await AIProviderFactory.testConnection(providerConfig);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error testing AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Connection test failed',
      },
      { status: 500 }
    );
  }
}

