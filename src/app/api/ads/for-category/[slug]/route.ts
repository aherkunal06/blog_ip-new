// app/api/ads/for-category/[slug]/route.ts
// Get ads for a specific category page

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { IntelligentProductSelector } from "@/services/intelligentProductSelector";

export const dynamic = "force-dynamic";

interface CategoryAdsParams {
  params: Promise<{ slug: string }>;
}

// GET /api/ads/for-category/[slug] - Get ads for category
export async function GET(request: Request, { params }: CategoryAdsParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") || "sidebar";
    const maxAds = parseInt(searchParams.get("maxAds") || "3");

    // Get category details
    const category = await queryOne(
      `SELECT id, name, slug FROM Category WHERE slug = ? AND status = 1`,
      [slug]
    );

    if (!category) {
      return NextResponse.json({ ads: [] });
    }

    const categoryId = (category as any).id;
    const categoryName = (category as any).name;

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
      AND (showOnCategoryPages = TRUE OR showOnBlogPages = TRUE)
    )`;
    campaignsParams.push(placement);

    const campaigns = await query(campaignsSql, campaignsParams);

    // Filter campaigns by targeting rules
    const matchingCampaigns = (campaigns as any[]).filter((campaign) => {
      if (campaign.targetType === "all") return true;

      if (campaign.targetType === "categories") {
        const targetCategories = campaign.targetCategories
          ? JSON.parse(campaign.targetCategories)
          : [];
        return targetCategories.includes(categoryId);
      }

      // TODO: Implement keyword matching
      return false;
    });

    // If no campaigns match, use intelligent product selection based on category
    if (matchingCampaigns.length === 0) {
      try {
        // Get products from ProductIndex that match this category
        const categoryProducts = await query(
          `SELECT * FROM ProductIndex 
           WHERE category = ? AND syncStatus = 'active'
           ORDER BY adminPriority DESC, popularityScore DESC
           LIMIT ?`,
          [categoryName, maxAds * 2] // Get more to filter better
        );

        if ((categoryProducts as any[]).length > 0) {
          // Convert ProductIndex to AdItem format
          const intelligentAds = (categoryProducts as any[]).slice(0, maxAds).map((product) => ({
            id: product.id,
            productUrl: product.ipshopyUrl,
            productName: product.name,
            productImage: product.image,
            productPrice: product.price,
            productSalePrice: product.salePrice,
            title: product.name,
            description: product.description ? 
              (product.description.length > 150 
                ? product.description.substring(0, 150) + '...' 
                : product.description) 
              : null,
            ctaText: "Shop Now",
            campaignId: 0, // No campaign
            campaignName: "Category Match",
          }));

          return NextResponse.json({
            ads: intelligentAds,
            placement,
            source: 'category-match'
          });
        }

        // Fallback to intelligent product selector
        const selector = new IntelligentProductSelector();
        const matches = await selector.selectProductsForCategory(categoryName, {
          maxProducts: maxAds,
          minRelevanceScore: 20,
          placement
        });

        const intelligentAds = matches.map((match) => ({
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
          campaignId: 0,
          campaignName: "Intelligent Match",
        }));

        return NextResponse.json({
          ads: intelligentAds,
          placement,
          source: 'intelligent'
        });
      } catch (error: any) {
        console.error("Error in intelligent product selection:", error);
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

    return NextResponse.json({
      ads: ads || [],
      placement,
    });
  } catch (error: any) {
    console.error("Error fetching ads for category:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads", message: error.message },
      { status: 500 }
    );
  }
}

