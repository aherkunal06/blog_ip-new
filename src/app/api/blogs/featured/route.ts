// app/api/blogs/featured/route.ts
// Get featured blog (latest or most popular)

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/blogs/featured - Get featured blog
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "latest"; // latest or popular

    let sql = `
      SELECT b.*, 
             au.username as author_username,
             au.name as author_name,
             GROUP_CONCAT(DISTINCT c.name) as categories
      FROM Blog b
      INNER JOIN AdminUser au ON b.authorId = au.id
      LEFT JOIN BlogCategory bc ON b.id = bc.blogId
      LEFT JOIN Category c ON bc.categoryId = c.id
      WHERE b.status = TRUE
      GROUP BY b.id, b.title, b.slug, b.content, b.image, b.imageAlt, b.metaDescription, b.authorId, b.status, b.createdAt, b.updatedAt, au.username, au.name
    `;

    if (type === "popular") {
      // Most liked/favorited blog
      sql += `
        ORDER BY (
          (SELECT COUNT(*) FROM Likes WHERE blogId = b.id) +
          (SELECT COUNT(*) FROM Favorite WHERE blogId = b.id) * 2
        ) DESC
      `;
    } else {
      // Latest blog
      sql += ` ORDER BY b.createdAt DESC`;
    }

    sql += ` LIMIT 1`;

    const blog = await queryOne(sql);

    if (!blog) {
      return NextResponse.json({ blog: null });
    }

    // Get blog image
    const blogData = {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      image: blog.image,
      imageAlt: blog.imageAlt,
      metaDescription: blog.metaDescription,
      author: {
        username: blog.author_username,
        name: blog.author_name,
      },
      categories: blog.categories ? blog.categories.split(",") : [],
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    };

    // Get first linked product for thumbnail
    // BlogProduct links to Product table, match ProductIndex by URL
    const products = await query(
      `SELECT pi.* FROM ProductIndex pi
       INNER JOIN Product p ON pi.ipshopyUrl = p.ipshopyUrl
       INNER JOIN BlogProduct bp ON p.id = bp.productId
       WHERE bp.blogId = ? AND pi.syncStatus = 'active'
       ORDER BY bp.position ASC
       LIMIT 1`,
      [blog.id]
    );

    return NextResponse.json({
      blog: blogData,
      firstProduct: (products as any[]).length > 0 ? products[0] : null,
    });
  } catch (error: any) {
    console.error("Error fetching featured blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured blog", message: error.message },
      { status: 500 }
    );
  }
}

