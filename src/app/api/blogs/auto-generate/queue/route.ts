import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/queue - Get queue status
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT q.*, pi.name as productName
      FROM GenerationQueue q
      INNER JOIN ProductIndex pi ON q.productIndexId = pi.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND q.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY q.priority DESC, q.createdAt ASC`;

    const queue = await query(sql, params);

    // Get stats
    const stats = await queryOne<{
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    }>(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
       FROM GenerationQueue`
    );

    return NextResponse.json({
      queue: queue.map((q: any) => ({
        id: q.id,
        productId: q.productIndexId,
        productName: q.productName,
        queueType: q.queueType,
        priority: q.priority,
        status: q.status,
        scheduledAt: q.scheduledAt,
        startedAt: q.startedAt,
        completedAt: q.completedAt,
        errorMessage: q.errorMessage,
        retryCount: q.retryCount,
        createdAt: q.createdAt,
      })),
      stats: {
        pending: stats?.pending || 0,
        processing: stats?.processing || 0,
        completed: stats?.completed || 0,
        failed: stats?.failed || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

// POST /api/blogs/auto-generate/queue - Add items to queue
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const body = await req.json();
    const { productIds, queueType, priority, scheduledAt } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      );
    }

    if (!queueType || !['titles', 'articles', 'both'].includes(queueType)) {
      return NextResponse.json(
        { error: 'queueType must be "titles", "articles", or "both"' },
        { status: 400 }
      );
    }

    const results = [];

    for (const productId of productIds) {
      // Check if already in queue
      const existing = await queryOne(
        `SELECT id FROM GenerationQueue 
         WHERE productIndexId = ? AND status IN ('pending', 'processing')`,
        [productId]
      );

      if (existing) {
        results.push({
          productId,
          success: false,
          message: 'Already in queue',
        });
        continue;
      }

      // Add to queue
      const queueId = await insert(
        `INSERT INTO GenerationQueue (
          productIndexId, queueType, priority, status, scheduledAt, createdBy
        ) VALUES (?, ?, ?, 'pending', ?, ?)`,
        [
          productId,
          queueType,
          priority || 50,
          scheduledAt || null,
          adminUserId,
        ]
      );

      results.push({
        productId,
        queueId,
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      added: results.filter((r) => r.success).length,
      results,
    });
  } catch (error: any) {
    console.error('Error adding to queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add to queue' },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/auto-generate/queue/{id} - Update queue item
export async function PUT(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queueId = searchParams.get('id');

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { priority, status, scheduledAt } = body;

    const updates: string[] = [];
    const params: any[] = [];

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (scheduledAt !== undefined) {
      updates.push('scheduledAt = ?');
      params.push(scheduledAt);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(queueId);

    await execute(
      `UPDATE GenerationQueue SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: 'Queue item updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating queue item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update queue item' },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/auto-generate/queue/{id} - Remove from queue
export async function DELETE(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queueId = searchParams.get('id');

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    await execute(`DELETE FROM GenerationQueue WHERE id = ?`, [queueId]);

    return NextResponse.json({
      success: true,
      message: 'Queue item removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing queue item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove queue item' },
      { status: 500 }
    );
  }
}

