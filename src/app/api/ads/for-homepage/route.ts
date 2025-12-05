// app/api/ads/for-homepage/route.ts
// Get ads for homepage

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/ads/for-homepage - Get ads for homepage
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement") || "banner";
    const maxAds = parseInt(searchParams.get("maxAds") || "3");

    // Get active campaigns that match targeting
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    let campaignsSql = `
      SELECT * FROM AdCampaign 
      WHERE status = 'active'
      AND (startDate IS NULL OR startDate <= ?)
      AND (endDate IS NULL OR endDate >= ?)
      AND (targetType = 'all' OR targetType = 'keywords')
    `;
    const campaignsParams: any[] = [now, now];

    // Filter by placement
    campaignsSql += ` AND id IN (
      SELECT campaignId FROM AdPlacement 
      WHERE placementType = ? 
      AND showOnHomepage = TRUE
    )`;
    campaignsParams.push(placement);

    campaignsSql += ` ORDER BY priority DESC LIMIT 10`;
    const campaigns = await query(campaignsSql, campaignsParams);

    if ((campaigns as any[]).length === 0) {
      return NextResponse.json({ ads: [] });
    }

    const campaignIds = (campaigns as any[]).map((c) => c.id);

    // Get ad items from matching campaigns
    const placeholders = campaignIds.map(() => "?").join(",");
    const ads = await query(
      `SELECT ai.*, ac.name as campaignName, ac.priority as campaignPriority
       FROM AdItem ai
       INNER JOIN AdCampaign ac ON ai.campaignId = ac.id
       WHERE ai.campaignId IN (${placeholders})
       AND ai.status = 'active'
       ORDER BY ac.priority DESC, ai.adminPriority DESC, ai.displayOrder ASC
       LIMIT ?`,
      [...campaignIds, maxAds]
    );

    return NextResponse.json({
      ads: ads || [],
      placement,
    });
  } catch (error: any) {
    console.error("Error fetching ads for homepage:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads", message: error.message },
      { status: 500 }
    );
  }
}

