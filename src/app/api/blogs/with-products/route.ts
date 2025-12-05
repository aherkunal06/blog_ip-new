// app/api/blogs/with-products/route.ts
// Get blogs (with or without products) - shows all active blogs

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/blogs/with-products - Get blogs (with products if available)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "6");
    const onlyWithProducts = searchParams.get("onlyWithProducts") === "true"; // Optional filter

    // Get all active blogs (or only those with products if filter is set)
    let blogsQuery = `
      SELECT DISTINCT b.id, b.title, b.slug, b.image, b.imageAlt, b.metaDescription, 
              b.authorId, b.status, b.createdAt, b.updatedAt,
              au.username as author_username,
              au.name as author_name
       FROM Blog b
       INNER JOIN AdminUser au ON b.authorId = au.id
       WHERE b.status = TRUE
    `;

    // If onlyWithProducts is true, filter to blogs that have products
    if (onlyWithProducts) {
      blogsQuery += `
        AND (
          EXISTS (
            SELECT 1 FROM BlogProduct bp 
            INNER JOIN Product p ON bp.productId = p.id 
            WHERE bp.blogId = b.id AND p.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM ArticleHyperlink ah 
            INNER JOIN ProductIndex pi ON ah.linkedId = pi.id 
            WHERE ah.blogId = b.id AND ah.linkedType = 'product' AND pi.syncStatus = 'active'
          )
        )
      `;
    }

    blogsQuery += ` ORDER BY b.createdAt DESC LIMIT ?`;

    const blogs = await query(blogsQuery, [limit]) || [];

    // For each blog, get first product from either BlogProduct or ArticleHyperlink
    const blogsWithProducts = await Promise.all(
      (blogs as any[]).map(async (blog) => {
        // Try to get product from ArticleHyperlink first (auto-generated blogs)
        let products = await query(
          `SELECT pi.* FROM ProductIndex pi
           INNER JOIN ArticleHyperlink ah ON pi.id = ah.linkedId
           WHERE ah.blogId = ? AND ah.linkedType = 'product' AND pi.syncStatus = 'active'
           ORDER BY ah.position ASC
           LIMIT 1`,
          [blog.id]
        ) || [];

        // If no product from ArticleHyperlink, try BlogProduct -> Product -> ProductIndex
        if ((products as any[]).length === 0) {
          products = await query(
            `SELECT pi.* FROM ProductIndex pi
             INNER JOIN Product p ON pi.ipshopyUrl = p.ipshopyUrl
             INNER JOIN BlogProduct bp ON p.id = bp.productId
             WHERE bp.blogId = ? AND pi.syncStatus = 'active'
             ORDER BY bp.position ASC
             LIMIT 1`,
            [blog.id]
          ) || [];
        }

        return {
          id: blog.id,
          title: blog.title,
          slug: blog.slug,
          image: blog.image,
          imageAlt: blog.imageAlt,
          metaDescription: blog.metaDescription,
          author: {
            username: blog.author_username,
            name: blog.author_name,
          },
          createdAt: blog.createdAt,
          firstProduct: (products as any[]).length > 0 ? products[0] : null,
        };
      })
    );

    return NextResponse.json({ blogs: blogsWithProducts });
  } catch (error: any) {
    console.error("Error fetching blogs with products:", error);
    // Return empty result instead of error to prevent frontend crashes
    return NextResponse.json({ blogs: [] });
  }
}

