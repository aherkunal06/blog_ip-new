// app/api/products/sync/route.ts
// Product sync API endpoints

import { NextRequest, NextResponse } from "next/server";
import { productSyncService } from "@/services/productSync";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// GET /api/products/sync - Get sync status
export async function GET(req: NextRequest) {
  try {
    const status = await productSyncService.getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products/sync - Manual sync trigger
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if sync is already running
    if (productSyncService.isSyncRunning()) {
      return NextResponse.json(
        { error: "Sync is already running. Please wait for it to complete." },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.type || "manual";

    // Start sync (don't await - run in background)
    productSyncService
      .syncAllProducts(syncType as "manual" | "scheduled")
      .catch((error) => {
        console.error("Background sync error:", error);
      });

    return NextResponse.json({
      message: "Sync started",
      status: "processing",
    });
  } catch (error: any) {
    console.error("Error starting sync:", error);
    
    // Check if error is about concurrent sync
    if (error.message?.includes("already running")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to start sync", message: error.message },
      { status: 500 }
    );
  }
}

