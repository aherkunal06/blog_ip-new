import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/settings - Get all settings or by category
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let sql = `SELECT * FROM GenerationSettings WHERE isActive = TRUE`;
    const params: any[] = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY category, settingKey`;

    const settings = await query(sql, params);

    return NextResponse.json({
      settings: settings.map((s: any) => ({
        key: s.settingKey,
        value: parseSettingValue(s.settingValue, s.settingType),
        type: s.settingType,
        category: s.category,
        description: s.description,
        isActive: Boolean(s.isActive),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/auto-generate/settings/{key} - Update a setting
export async function PUT(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('key');

    if (!settingKey) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { value, isActive } = body;

    // Get old value for audit
    const oldSetting = await queryOne(
      `SELECT * FROM GenerationSettings WHERE settingKey = ?`,
      [settingKey]
    );

    if (!oldSetting) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Serialize value based on type
    const serializedValue = serializeSettingValue(value, oldSetting.settingType);

    // Update setting
    await execute(
      `UPDATE GenerationSettings 
       SET settingValue = ?, isActive = ?, updatedBy = ?, updatedAt = NOW()
       WHERE settingKey = ?`,
      [
        serializedValue,
        isActive !== undefined ? isActive : oldSetting.isActive,
        adminUserId,
        settingKey,
      ]
    );

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, oldValue, newValue)
       VALUES (?, 'update', ?, ?, ?, ?)`,
      [
        adminUserId,
        oldSetting.category,
        settingKey,
        oldSetting.settingValue,
        serializedValue,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// POST /api/blogs/auto-generate/settings/bulk - Bulk update settings
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const body = await req.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      );
    }

    const results = [];

    for (const setting of settings) {
      const { key, value } = setting;

      if (!key) continue;

      // Get setting type
      const existing = await queryOne(
        `SELECT * FROM GenerationSettings WHERE settingKey = ?`,
        [key]
      );

      if (!existing) continue;

      const serializedValue = serializeSettingValue(value, existing.settingType);

      await execute(
        `UPDATE GenerationSettings 
         SET settingValue = ?, updatedBy = ?, updatedAt = NOW()
         WHERE settingKey = ?`,
        [serializedValue, adminUserId, key]
      );

      results.push({ key, success: true });
    }

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, newValue)
       VALUES (?, 'update', 'settings', 'bulk', ?)`,
      [adminUserId, JSON.stringify(settings)]
    );

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error bulk updating settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk update settings' },
      { status: 500 }
    );
  }
}

// Helper functions
function parseSettingValue(value: string, type: string): any {
  try {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        return JSON.parse(value);
      case 'array':
        return JSON.parse(value);
      default:
        return value;
    }
  } catch {
    return value;
  }
}

function serializeSettingValue(value: any, type: string): string {
  switch (type) {
    case 'number':
      return String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'json':
    case 'array':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

// Export helpers for use in route handlers
export { parseSettingValue, serializeSettingValue };

