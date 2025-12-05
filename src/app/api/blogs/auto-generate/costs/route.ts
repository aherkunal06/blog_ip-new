import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/costs - Get cost data
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `SELECT * FROM GenerationCost WHERE 1=1`;
    const params: any[] = [];

    if (startDate) {
      sql += ` AND date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY date DESC, providerName`;

    const costs = await query(sql, params);

    // Calculate summary
    const summary = await queryOne<{
      totalCost: number;
      totalTokens: number;
      totalRequests: number;
    }>(
      `SELECT 
        SUM(totalCost) as totalCost,
        SUM(tokensUsed) as totalTokens,
        SUM(requestsCount) as totalRequests
       FROM GenerationCost
       ${startDate || endDate ? 'WHERE 1=1' : ''}
       ${startDate ? 'AND date >= ?' : ''}
       ${endDate ? 'AND date <= ?' : ''}`,
      [...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
    );

    return NextResponse.json({
      costs: costs.map((c: any) => ({
        date: c.date,
        providerName: c.providerName,
        tokensUsed: c.tokensUsed,
        requestsCount: c.requestsCount,
        totalCost: Number(c.totalCost),
      })),
      summary: {
        totalCost: Number(summary?.totalCost || 0),
        totalTokens: summary?.totalTokens || 0,
        totalRequests: summary?.totalRequests || 0,
        averageCostPerRequest:
          summary?.totalRequests && summary.totalRequests > 0
            ? Number(summary.totalCost) / summary.totalRequests
            : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

