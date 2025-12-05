// app/api/products/sync/status/route.ts
// Get detailed sync status and logs

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { productSyncService } from "@/services/productSync";

export const dynamic = "force-dynamic";

// GET /api/products/sync/status - Get sync status and recent logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get sync status
    const status = await queryOne<{
      lastSync: Date | null;
      totalProducts: number;
      activeProducts: number;
      deletedProducts: number;
    }>(
      `SELECT 
        (SELECT startedAt FROM ProductSyncLog ORDER BY startedAt DESC LIMIT 1) as lastSync,
        (SELECT COUNT(*) FROM ProductIndex) as totalProducts,
        (SELECT COUNT(*) FROM ProductIndex WHERE syncStatus = 'active') as activeProducts,
        (SELECT COUNT(*) FROM ProductIndex WHERE syncStatus = 'deleted') as deletedProducts`
    );

    // Get recent sync logs
    const logs = await query(
      `SELECT * FROM ProductSyncLog 
       ORDER BY startedAt DESC 
       LIMIT ?`,
      [limit]
    );

    // Get current sync progress if available
    const progress = productSyncService.getProgress();
    const progressData = progress ? {
      isRunning: progress.isRunning,
      total: progress.total,
      processed: progress.processed,
      created: progress.created,
      updated: progress.updated,
      deleted: progress.deleted,
      currentBatch: progress.currentBatch,
      totalBatches: progress.totalBatches,
      percentage: progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0,
      elapsedSeconds: Math.round((Date.now() - progress.startTime) / 1000),
      errors: progress.errors.length,
    } : null;

    return NextResponse.json({
      status,
      recentLogs: logs,
      progress: progressData,
    });
  } catch (error: any) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status", message: error.message },
      { status: 500 }
    );
  }
}

