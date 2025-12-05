// app/api/ads/for-blog/[slug]/route.ts
// Get ads for a specific blog post

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { IntelligentProductSelector } from "@/services/intelligentProductSelector";

export const dynamic = "force-dynamic";

interface BlogAdsParams {
  params: Promise<{ slug: string }>;
}

// GET /api/ads/for-blog/[slug] - Get ads for blog
export async function GET(request: Request, { params }: BlogAdsParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") || "sidebar";
    const maxAds = parseInt(searchParams.get("maxAds") || "3");

    // Get blog details
    const blog = await queryOne(
      `SELECT id, title, slug FROM Blog WHERE slug = ? AND status = TRUE`,
      [slug]
    );

    if (!blog) {
      return NextResponse.json({ ads: [] });
    }

    const blogId = (blog as any).id;

    // Get blog categories
    const blogCategories = await query(
      `SELECT categoryId FROM BlogCategory WHERE blogId = ?`,
      [blogId]
    );
    const categoryIds = (blogCategories as any[]).map((c) => c.categoryId);

    // Get active campaigns that match targeting
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    let campaignsSql = `
      SELECT * FROM AdCampaign 
      WHERE status = 'active'
      AND (startDate IS NULL OR startDate <= ?)
      AND (endDate IS NULL OR endDate >= ?)
    `;
    const campaignsParams: any[] = [now, now];

    // Filter by placement
    campaignsSql += ` AND id IN (
      SELECT campaignId FROM AdPlacement 
      WHERE placementType = ? 
      AND (showOnBlogPages = TRUE)
    )`;
    campaignsParams.push(placement);

    const campaigns = await query(campaignsSql, campaignsParams);

    // Filter campaigns by targeting rules
    const matchingCampaigns = (campaigns as any[]).filter((campaign) => {
      if (campaign.targetType === "all") return true;

      if (campaign.targetType === "blogs") {
        const targetBlogs = campaign.targetBlogs
          ? JSON.parse(campaign.targetBlogs)
          : [];
        return targetBlogs.includes(blogId);
      }

      if (campaign.targetType === "categories") {
        const targetCategories = campaign.targetCategories
          ? JSON.parse(campaign.targetCategories)
          : [];
        return categoryIds.some((cid) => targetCategories.includes(cid));
      }

      // TODO: Implement keyword matching
      return false;
    });

    // If no campaigns match, use intelligent product selection
    if (matchingCampaigns.length === 0) {
      try {
        const selector = new IntelligentProductSelector();
        const matches = await selector.selectProductsForBlogSlug(slug, {
          maxProducts: maxAds,
          minRelevanceScore: 20,
          placement
        });

        // Convert ProductIndex to AdItem format
        const intelligentAds = matches.map((match, index) => ({
          id: match.product.id,
          productUrl: match.product.ipshopyUrl,
          productName: match.product.name,
          productImage: match.product.image,
          productPrice: match.product.price,
          productSalePrice: match.product.salePrice,
          title: match.product.name,
          description: match.product.description ? 
            (match.product.description.length > 150 
              ? match.product.description.substring(0, 150) + '...' 
              : match.product.description) 
            : null,
          ctaText: "Shop Now",
          campaignId: 0, // No campaign
          campaignName: "Intelligent Match",
          relevanceScore: match.relevanceScore,
          finalScore: match.finalScore,
          matchReasons: match.matchReasons
        }));

        return NextResponse.json({
          ads: intelligentAds,
          placement,
          source: 'intelligent'
        });
      } catch (error: any) {
        console.error("Error in intelligent product selection:", error);
        // Fallback to empty ads
        return NextResponse.json({ ads: [] });
      }
    }

    const campaignIds = matchingCampaigns.map((c) => c.id);

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

    // Calculate scores and sort (simplified version)
    const scoredAds = (ads as any[]).map((ad) => {
      // Simple score calculation
      const score =
        (ad.campaignPriority || 0) * 0.5 + (ad.adminPriority || 50) * 0.5;
      return { ...ad, score };
    });

    scoredAds.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      ads: scoredAds.slice(0, maxAds),
      placement,
    });
  } catch (error: any) {
    console.error("Error fetching ads for blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads", message: error.message },
      { status: 500 }
    );
  }
}

