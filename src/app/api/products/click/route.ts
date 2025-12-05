// app/api/products/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { insert } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/products/click - Track product clicks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, blogId, userId, ipAddress } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get IP address from request if not provided
    const clientIp =
      ipAddress ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    await insert(
      `INSERT INTO ProductClick (productId, blogId, userId, ipAddress)
       VALUES (?, ?, ?, ?)`,
      [productId, blogId || null, userId || null, clientIp]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking product click:", error);
    return NextResponse.json(
      { error: "Failed to track click", message: error.message },
      { status: 500 }
    );
  }
}

