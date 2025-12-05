import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { AIProviderFactory } from '@/services/ai/aiProviderFactory';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/ai-providers - Get all AI providers
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await query(
      `SELECT id, providerName, modelName, temperature, maxTokens, 
              rateLimitPerMinute, isActive, isDefault, costPerToken, baseUrl
       FROM AIProviderConfig
       ORDER BY isDefault DESC, isActive DESC, createdAt DESC`
    );

    const defaultProvider = await queryOne<{ id: number }>(
      `SELECT id FROM AIProviderConfig WHERE isDefault = TRUE AND isActive = TRUE LIMIT 1`
    );

    return NextResponse.json({
      providers: providers.map((p: any) => ({
        id: p.id,
        providerName: p.providerName,
        modelName: p.modelName,
        temperature: Number(p.temperature),
        maxTokens: p.maxTokens,
        rateLimitPerMinute: p.rateLimitPerMinute,
        isActive: Boolean(p.isActive),
        isDefault: Boolean(p.isDefault),
        costPerToken: p.costPerToken ? Number(p.costPerToken) : null,
        baseUrl: p.baseUrl || null,
      })),
      defaultProvider: defaultProvider?.id || null,
    });
  } catch (error: any) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI providers' },
      { status: 500 }
    );
  }
}

// POST /api/blogs/auto-generate/ai-providers - Create new AI provider
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const body = await req.json();
    const {
      providerName,
      apiKey,
      apiSecret,
      baseUrl,
      modelName,
      temperature,
      maxTokens,
      rateLimitPerMinute,
      isDefault,
      costPerToken,
    } = body;

    // For Ollama, apiKey is optional (can be 'ollama' or empty)
    // For other providers, apiKey is required
    if (!providerName || !modelName) {
      return NextResponse.json(
        { error: 'providerName and modelName are required' },
        { status: 400 }
      );
    }

    if (providerName !== 'ollama' && !apiKey) {
      return NextResponse.json(
        { error: 'apiKey is required for non-Ollama providers' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await execute(
        `UPDATE AIProviderConfig SET isDefault = FALSE WHERE providerName = ?`,
        [providerName]
      );
    }

    // Insert new provider
    const providerId = await insert(
      `INSERT INTO AIProviderConfig (
        providerName, apiKey, apiSecret, baseUrl, modelName, temperature, maxTokens,
        rateLimitPerMinute, isActive, isDefault, costPerToken, updatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)`,
      [
        providerName,
        apiKey || (providerName === 'ollama' ? 'ollama' : ''), // For Ollama, use 'ollama' as default
        apiSecret || null,
        baseUrl || (providerName === 'ollama' ? 'http://localhost:11434' : null),
        modelName,
        temperature || 0.7,
        maxTokens || 2000,
        rateLimitPerMinute || 60,
        isDefault || false,
        costPerToken || null,
        adminUserId,
      ]
    );

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, newValue)
       VALUES (?, 'create', 'ai', 'provider', ?)`,
      [adminUserId, JSON.stringify({ providerId, providerName, modelName })]
    );

    return NextResponse.json({
      success: true,
      providerId,
      message: 'AI provider created successfully',
    });
  } catch (error: any) {
    console.error('Error creating AI provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create AI provider' },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/auto-generate/ai-providers/[id] - Update AI provider
export async function PUT(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('id');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      apiKey,
      apiSecret,
      baseUrl,
      modelName,
      temperature,
      maxTokens,
      rateLimitPerMinute,
      isActive,
      isDefault,
      costPerToken,
    } = body;

    // Get old values for audit
    const oldProvider = await queryOne(
      `SELECT * FROM AIProviderConfig WHERE id = ?`,
      [providerId]
    );

    if (!oldProvider) {
      return NextResponse.json(
        { error: 'AI provider not found' },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await execute(
        `UPDATE AIProviderConfig SET isDefault = FALSE WHERE id != ?`,
        [providerId]
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (apiKey !== undefined) {
      updates.push('apiKey = ?');
      params.push(apiKey);
    }
    if (apiSecret !== undefined) {
      updates.push('apiSecret = ?');
      params.push(apiSecret);
    }
    if (baseUrl !== undefined) {
      updates.push('baseUrl = ?');
      params.push(baseUrl);
    }
    if (modelName !== undefined) {
      updates.push('modelName = ?');
      params.push(modelName);
    }
    if (temperature !== undefined) {
      updates.push('temperature = ?');
      params.push(temperature);
    }
    if (maxTokens !== undefined) {
      updates.push('maxTokens = ?');
      params.push(maxTokens);
    }
    if (rateLimitPerMinute !== undefined) {
      updates.push('rateLimitPerMinute = ?');
      params.push(rateLimitPerMinute);
    }
    if (isActive !== undefined) {
      // Prevent deactivating if it's the only active provider
      if (isActive === false) {
        const activeProviders = await query<{ id: number }>(
          `SELECT id FROM AIProviderConfig WHERE isActive = TRUE AND id != ?`,
          [providerId]
        );
        
        if (activeProviders.length === 0) {
          return NextResponse.json(
            { error: 'Cannot deactivate the last active provider. At least one provider must be active.' },
            { status: 400 }
          );
        }

        // If deactivating the default provider, set another active provider as default
        if (oldProvider.isDefault) {
          const newDefault = activeProviders[0];
          await execute(
            `UPDATE AIProviderConfig SET isDefault = TRUE WHERE id = ?`,
            [newDefault.id]
          );
        }
      }
      
      updates.push('isActive = ?');
      params.push(isActive);
    }
    if (isDefault !== undefined) {
      updates.push('isDefault = ?');
      params.push(isDefault);
    }
    if (costPerToken !== undefined) {
      updates.push('costPerToken = ?');
      params.push(costPerToken);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updatedBy = ?', 'updatedAt = NOW()');
    params.push(adminUserId, providerId);

    await execute(
      `UPDATE AIProviderConfig SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Clear cache for this provider
    AIProviderFactory.clearCache(parseInt(providerId));

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, oldValue, newValue)
       VALUES (?, 'update', 'ai', 'provider', ?, ?)`,
      [
        adminUserId,
        JSON.stringify(oldProvider),
        JSON.stringify({ ...oldProvider, ...body }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'AI provider updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating AI provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update AI provider' },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/auto-generate/ai-providers/[id] - Delete AI provider
export async function DELETE(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('id');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Check if it's the default provider
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

    if (provider.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default provider. Set another as default first.' },
        { status: 400 }
      );
    }

    // Delete provider
    await execute(`DELETE FROM AIProviderConfig WHERE id = ?`, [providerId]);

    // Clear cache
    AIProviderFactory.clearCache(parseInt(providerId));

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, oldValue)
       VALUES (?, 'delete', 'ai', 'provider', ?)`,
      [adminUserId, JSON.stringify(provider)]
    );

    return NextResponse.json({
      success: true,
      message: 'AI provider deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete AI provider' },
      { status: 500 }
    );
  }
}

