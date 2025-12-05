import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/exclusions - Get all exclusions
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'product' or 'category'

    let sql = `
      SELECT e.*, au.username as excludedBy_username
      FROM GenerationExclusion e
      INNER JOIN AdminUser au ON e.excludedBy = au.id
      WHERE e.isActive = TRUE
    `;
    const params: any[] = [];

    if (type) {
      sql += ` AND e.exclusionType = ?`;
      params.push(type);
    }

    sql += ` ORDER BY e.excludedAt DESC`;

    const exclusions = await query(sql, params);

    // Get target names
    const exclusionsWithNames = await Promise.all(
      exclusions.map(async (ex: any) => {
        let targetName = 'Unknown';

        if (ex.exclusionType === 'product') {
          const product = await queryOne<{ name: string }>(
            `SELECT name FROM ProductIndex WHERE id = ?`,
            [ex.targetId]
          );
          targetName = product?.name || `Product ${ex.targetId}`;
        } else if (ex.exclusionType === 'category') {
          const category = await queryOne<{ name: string }>(
            `SELECT name FROM Category WHERE id = ?`,
            [ex.targetId]
          );
          targetName = category?.name || `Category ${ex.targetId}`;
        }

        return {
          id: ex.id,
          type: ex.exclusionType,
          targetId: ex.targetId,
          targetName,
          reason: ex.reason,
          excludedBy: ex.excludedBy_username,
          excludedAt: ex.excludedAt,
          expiresAt: ex.expiresAt,
        };
      })
    );

    return NextResponse.json({
      exclusions: exclusionsWithNames,
    });
  } catch (error: any) {
    console.error('Error fetching exclusions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exclusions' },
      { status: 500 }
    );
  }
}

// POST /api/blogs/auto-generate/exclusions - Add exclusion
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const body = await req.json();
    const { type, targetId, reason, expiresAt } = body;

    if (!type || !targetId) {
      return NextResponse.json(
        { error: 'type and targetId are required' },
        { status: 400 }
      );
    }

    if (type !== 'product' && type !== 'category') {
      return NextResponse.json(
        { error: 'type must be "product" or "category"' },
        { status: 400 }
      );
    }

    // Check if already excluded
    const existing = await queryOne(
      `SELECT id FROM GenerationExclusion 
       WHERE exclusionType = ? AND targetId = ? AND isActive = TRUE`,
      [type, targetId]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'Item is already excluded' },
        { status: 409 }
      );
    }

    // Verify target exists
    if (type === 'product') {
      const product = await queryOne(
        `SELECT id FROM ProductIndex WHERE id = ?`,
        [targetId]
      );
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
    } else {
      const category = await queryOne(
        `SELECT id FROM Category WHERE id = ?`,
        [targetId]
      );
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }
    }

    // Insert exclusion
    const exclusionId = await insert(
      `INSERT INTO GenerationExclusion (exclusionType, targetId, reason, excludedBy, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
      [type, targetId, reason || null, adminUserId, expiresAt || null]
    );

    return NextResponse.json({
      success: true,
      exclusionId,
      message: 'Exclusion added successfully',
    });
  } catch (error: any) {
    console.error('Error adding exclusion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add exclusion' },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/auto-generate/exclusions/{id} - Remove exclusion
export async function DELETE(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exclusionId = searchParams.get('id');

    if (!exclusionId) {
      return NextResponse.json(
        { error: 'Exclusion ID is required' },
        { status: 400 }
      );
    }

    // Soft delete (set isActive = FALSE)
    await execute(
      `UPDATE GenerationExclusion SET isActive = FALSE WHERE id = ?`,
      [exclusionId]
    );

    return NextResponse.json({
      success: true,
      message: 'Exclusion removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing exclusion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove exclusion' },
      { status: 500 }
    );
  }
}

