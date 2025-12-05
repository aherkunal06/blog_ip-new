// app/api/products/category/[category]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CategoryParams {
  params: Promise<{ category: string }>;
}

// GET /api/products/category/[category] - Get products by category
export async function GET(request: Request, { params }: CategoryParams) {
  try {
    const { category } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6");

    const products = await query(
      `SELECT * FROM Product 
       WHERE category = ? AND status = 'active'
       ORDER BY createdAt DESC 
       LIMIT ?`,
      [category, limit]
    );

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching products by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", message: error.message },
      { status: 500 }
    );
  }
}

