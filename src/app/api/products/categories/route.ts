// app/api/products/categories/route.ts
// Get product categories with counts

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/products/categories - Get product categories
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8");

    // Get unique categories with counts and sample images
    const categories = await query(
      `SELECT 
        category as name,
        COUNT(*) as productCount,
        MIN(image) as image
       FROM ProductIndex
       WHERE syncStatus = 'active' AND category IS NOT NULL AND category != ''
       GROUP BY category
       ORDER BY productCount DESC
       LIMIT ?`,
      [limit]
    ) || [];

    // Decode HTML entities in category names
    const decodeHtmlEntities = (text: string): string => {
      if (!text) return text;
      const entities: { [key: string]: string } = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™',
      };
      return text.replace(/&[#\w]+;/g, (entity) => {
        return entities[entity] || entity;
      });
    };

    const formatted = (categories as any[]).map((cat) => ({
      name: decodeHtmlEntities(cat.name || ''),
      productCount: Number(cat.productCount) || 0,
      image: cat.image || null,
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error: any) {
    console.error("Error fetching product categories:", error);
    // Return empty result instead of error to prevent frontend crashes
    return NextResponse.json({ categories: [] });
  }
}

