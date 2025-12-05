// src/app/api/blogs/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/uploadImageMiddleware";
import { query, queryOne, insert } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// ----------------- CREATE CATEGORY -----------------
export async function POST(req: NextRequest) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string | null;
    const imageFile = formData.get("image") as File | null;
    const isHelpCategory = formData.get("isHelpCategory") === "true";

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, message: "Name and slug are required" },
        { status: 400 }
      );
    }

    let imageUrl = "";
    if (imageFile) {
      try {
        const { secure_url } = await uploadImageToCloudinary(imageFile);
        imageUrl = secure_url;
      } catch (uploadError: any) {
        // Log full error for debugging (server-side only)
        console.error("Cloudinary upload error:", uploadError);
        // Return user-friendly message without exposing sensitive data
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image. Please check your Cloudinary configuration." },
          { status: 500 }
        );
      }
    }

    const categoryId = await insert(
      'INSERT INTO Category (name, slug, description, image, status, isHelpCategory) VALUES (?, ?, ?, ?, ?, ?)',
      [name, slug, description, imageUrl, false, isHelpCategory]
    );

    const category = await queryOne<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>(
      'SELECT * FROM Category WHERE id = ?',
      [categoryId]
    );

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error creating category:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, message: "Category name or slug already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- GET CATEGORIES -----------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit');
    const slug = searchParams.get('slug');
    const status = searchParams.get('status'); // 'approved' or 'pending' or null for all

    let sql = `SELECT c.id, c.name, c.image, c.slug, c.description, c.status,
              COUNT(bc.id) as blogCount
       FROM Category c
       LEFT JOIN BlogCategory bc ON c.id = bc.categoryId
       LEFT JOIN Blog b ON bc.blogId = b.id AND b.status = 1`;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by slug if provided
    if (slug) {
      conditions.push('c.slug = ?');
      params.push(slug);
    }

    // Filter by status if provided
    if (status === 'approved') {
      conditions.push('c.status = 1');
    } else if (status === 'pending') {
      conditions.push('c.status = 0');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` GROUP BY c.id, c.name, c.image, c.slug, c.description, c.status
             ORDER BY c.name ASC`;

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        sql += ` LIMIT ${limitNum}`;
      }
    }

    const categories = await query<Array<{
      id: number;
      name: string;
      image: string | null;
      slug: string;
      description: string | null;
      status: boolean;
      blogCount: number;
    }>>(sql, params);

    // Format response
    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      slug: c.slug,
      description: c.description,
      status: c.status,
      posts: Number(c.blogCount), // number of blogs
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

