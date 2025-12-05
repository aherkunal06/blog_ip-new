// app/api/products/featured/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/products/featured - Get featured products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "6");

    const products = await query(
      `SELECT * FROM Product 
       WHERE status = 'active' 
       ORDER BY createdAt DESC 
       LIMIT ?`,
      [limit]
    );

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching featured products:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured products", message: error.message },
      { status: 500 }
    );
  }
}

