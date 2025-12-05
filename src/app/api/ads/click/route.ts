// app/api/ads/click/route.ts
// Track ad clicks

import { NextRequest, NextResponse } from "next/server";
import { insert, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/ads/click - Track ad click
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

    // Record click
    await insert(
      `INSERT INTO AdClick (
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

    // Update ad item click count
    await execute(
      `UPDATE AdItem SET clicks = clicks + 1 WHERE id = ?`,
      [adItemId]
    );

    // Update campaign click count
    await execute(
      `UPDATE AdCampaign SET totalClicks = totalClicks + 1 WHERE id = ?`,
      [campaignId]
    );

    // Update performance score (simplified)
    const adItem = await execute(
      `SELECT impressions, clicks FROM AdItem WHERE id = ?`,
      [adItemId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking click:", error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false, error: error.message });
  }
}

