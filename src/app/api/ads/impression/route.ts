// app/api/ads/impression/route.ts
// Track ad impressions

import { NextRequest, NextResponse } from "next/server";
import { insert, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/ads/impression - Track ad impression
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adItemId, campaignId, blogId, categoryId, userId } = body;

    if (!adItemId || !campaignId) {
      return NextResponse.json(
        { error: "adItemId and campaignId are required" },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || null;
    const referrer = req.headers.get("referer") || null;

    // Record impression
    await insert(
      `INSERT INTO AdImpression (
        adItemId, campaignId, blogId, categoryId, userId,
        ipAddress, userAgent, referrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adItemId,
        campaignId,
        blogId || null,
        categoryId || null,
        userId || null,
        ipAddress,
        userAgent,
        referrer,
      ]
    );

    // Update ad item impression count
    await execute(
      `UPDATE AdItem SET impressions = impressions + 1 WHERE id = ?`,
      [adItemId]
    );

    // Update campaign impression count
    await execute(
      `UPDATE AdCampaign SET totalImpressions = totalImpressions + 1 WHERE id = ?`,
      [campaignId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking impression:", error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false, error: error.message });
  }
}

