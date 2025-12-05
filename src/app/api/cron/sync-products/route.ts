// app/api/cron/sync-products/route.ts
// Cron job endpoint for scheduled product sync
// Call this endpoint via cron job or scheduled task

import { NextRequest, NextResponse } from "next/server";
import { productSyncService } from "@/services/productSync";

export const dynamic = "force-dynamic";

// GET /api/cron/sync-products - Scheduled sync (called by cron)
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Start sync
    const result = await productSyncService.syncAllProducts("scheduled");

    return NextResponse.json({
      success: result.success,
      message: "Sync completed",
      ...result,
    });
  } catch (error: any) {
    console.error("Error in scheduled sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/cron/sync-products - Alternative POST method
export async function POST(req: NextRequest) {
  return GET(req);
}

