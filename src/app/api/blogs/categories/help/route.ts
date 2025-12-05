// app/api/blogs/categories/help/route.ts
// Get help-related categories

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/blogs/categories/help - Get help categories
export async function GET(req: NextRequest) {
  try {
    const helpKeywords = [
      "installation",
      "troubleshooting",
      "faq",
      "guide",
      "help",
      "support",
      "how-to",
      "setup",
    ];

    // Get help categories (marked as isHelpCategory OR matching keywords)
    const allCategories = await query(
      `SELECT c.*, COUNT(DISTINCT bc.blogId) as blogCount
       FROM Category c
       LEFT JOIN BlogCategory bc ON c.id = bc.categoryId
       LEFT JOIN Blog b ON bc.blogId = b.id AND b.status = TRUE
       WHERE c.status = TRUE AND (c.isHelpCategory = TRUE OR 
         LOWER(c.name) LIKE '%installation%' OR
         LOWER(c.name) LIKE '%troubleshooting%' OR
         LOWER(c.name) LIKE '%faq%' OR
         LOWER(c.name) LIKE '%guide%' OR
         LOWER(c.name) LIKE '%help%' OR
         LOWER(c.name) LIKE '%support%' OR
         LOWER(c.name) LIKE '%how-to%' OR
         LOWER(c.name) LIKE '%setup%')
       GROUP BY c.id, c.name, c.slug, c.description, c.image, c.status, c.isHelpCategory, c.createdAt, c.updatedAt
       ORDER BY c.isHelpCategory DESC, blogCount DESC
       LIMIT 4`
    );

    // Format help categories
    const helpCategories = (allCategories as any[])
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        blogCount: Number(cat.blogCount) || 0,
      }));

    return NextResponse.json({ categories: helpCategories });
  } catch (error: any) {
    console.error("Error fetching help categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch help categories", message: error.message },
      { status: 500 }
    );
  }
}

