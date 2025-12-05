// app/api/blogs/categories/trending/route.ts
// Get trending/popular categories

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/blogs/categories/trending - Get trending categories
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "6");

    // Get categories with blog and product counts
    const categories = await query(
      `SELECT c.*, 
              COUNT(DISTINCT bc.blogId) as blogCount
       FROM Category c
       LEFT JOIN BlogCategory bc ON c.id = bc.categoryId
       LEFT JOIN Blog b ON bc.blogId = b.id AND b.status = TRUE
       WHERE c.status = TRUE
       GROUP BY c.id, c.name, c.slug, c.description, c.image, c.status, c.createdAt, c.updatedAt
       HAVING blogCount > 0
       ORDER BY blogCount DESC
       LIMIT ?`,
      [limit]
    ) || [];

    // Add product counts
    const categoriesWithProducts = await Promise.all(
      (categories as any[]).map(async (cat) => {
        const products = await query(
          `SELECT COUNT(*) as count FROM ProductIndex 
           WHERE category = ? AND syncStatus = 'active'`,
          [cat.name]
        ) || [];

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          blogCount: Number(cat.blogCount) || 0,
          productCount: Number((products as any[])[0]?.count) || 0,
        };
      })
    );

    return NextResponse.json({ categories: categoriesWithProducts });
  } catch (error: any) {
    console.error("Error fetching trending categories:", error);
    // Return empty result instead of error to prevent frontend crashes
    return NextResponse.json({ categories: [] });
  }
}

