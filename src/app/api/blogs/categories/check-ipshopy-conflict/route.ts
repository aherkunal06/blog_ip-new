// app/api/blogs/categories/check-ipshopy-conflict/route.ts
// Check if category name or slug conflicts with ipshopy.com URLs

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/blogs/categories/check-ipshopy-conflict - Check for conflicts with ipshopy
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId"); // For editing existing categories

    if (!name && !slug) {
      return NextResponse.json(
        { error: "Name or slug parameter is required" },
        { status: 400 }
      );
    }

    const conflicts: string[] = [];

    // Check if slug exists in ProductIndex (ipshopy product URLs)
    if (slug) {
      // Check if slug matches any product keyword in ProductIndex.ipshopyUrl
      // ProductIndex.ipshopyUrl format: https://ipshopy.com/keyword
      // Extract keyword from URL and compare with slug
      const productConflict = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM ProductIndex 
         WHERE syncStatus = 'active' 
         AND (
           ipshopyUrl LIKE ? OR 
           ipshopyUrl LIKE ? OR 
           ipshopyUrl = ? OR
           slug = ?
         )`,
        [
          `%/${slug}%`,      // URL contains /slug
          `%/${slug}/%`,     // URL contains /slug/
          `https://ipshopy.com/${slug}`,  // Exact match
          slug               // Slug matches
        ]
      );

      if (productConflict && Number(productConflict.count) > 0) {
        conflicts.push(
          `Slug "${slug}" conflicts with an existing ipshopy.com product URL. Please choose a different slug.`
        );
      }

      // Also check if slug matches any category in ProductIndex
      const categoryConflict = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM ProductIndex 
         WHERE syncStatus = 'active' 
         AND category = ?`,
        [slug]
      );

      if (categoryConflict && Number(categoryConflict.count) > 0) {
        conflicts.push(
          `Slug "${slug}" matches an existing product category on ipshopy.com. Please choose a different slug.`
        );
      }
    }

    // Check if name matches any product category
    if (name) {
      const categoryNameConflict = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM ProductIndex 
         WHERE syncStatus = 'active' 
         AND category = ?`,
        [name]
      );

      if (categoryNameConflict && Number(categoryNameConflict.count) > 0) {
        conflicts.push(
          `Category name "${name}" matches an existing product category on ipshopy.com. Consider using a different name to avoid confusion.`
        );
      }
    }

    // Check reserved slugs that might conflict with ipshopy routes
    const reservedSlugs = [
      "products",
      "categories",
      "cart",
      "checkout",
      "account",
      "login",
      "register",
      "search",
      "blog",
      "blogs",
      "events",
      "about",
      "contact",
      "privacy",
      "terms",
      "help",
      "support",
    ];

    if (slug && reservedSlugs.includes(slug.toLowerCase())) {
      conflicts.push(
        `Slug "${slug}" is a reserved route on ipshopy.com. Please choose a different slug.`
      );
    }

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
      conflicts,
      isSafe: conflicts.length === 0,
    });
  } catch (error: any) {
    console.error("Error checking ipshopy conflict:", error);
    return NextResponse.json(
      { error: "Failed to check for conflicts", message: error.message },
      { status: 500 }
    );
  }
}

