// app/api/ads/campaigns/[id]/items/route.ts
// Manage ad items within a campaign

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface CampaignItemsParams {
  params: Promise<{ id: string }>;
}

// GET /api/ads/campaigns/[id]/items - Get all items in campaign
export async function GET(request: Request, { params }: CampaignItemsParams) {
  try {
    const { id } = await params;
    const items = await query(
      `SELECT * FROM AdItem WHERE campaignId = ? ORDER BY displayOrder ASC, createdAt ASC`,
      [id]
    );

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Error fetching campaign items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/ads/campaigns/[id]/items - Add item to campaign
export async function POST(req: NextRequest, { params }: CampaignItemsParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      productIndexId,
      productUrl,
      productName,
      productImage,
      productPrice,
      productSalePrice,
      productDescription,
      productCategory,
      title,
      description,
      ctaText = "Shop Now",
      displayOrder = 0,
      weight = 1,
      adminPriority = 50,
    } = body;

    if (!productUrl || !productName) {
      return NextResponse.json(
        { error: "productUrl and productName are required" },
        { status: 400 }
      );
    }

    const insertId = await insert(
      `INSERT INTO AdItem (
        campaignId, productIndexId, productUrl, productName, productImage,
        productPrice, productSalePrice, productDescription, productCategory,
        title, description, ctaText, displayOrder, weight, adminPriority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        productIndexId || null,
        productUrl,
        productName,
        productImage || null,
        productPrice || null,
        productSalePrice || null,
        productDescription || null,
        productCategory || null,
        title || null,
        description || null,
        ctaText,
        displayOrder,
        weight,
        adminPriority,
      ]
    );

    const item = await queryOne(`SELECT * FROM AdItem WHERE id = ?`, [
      insertId,
    ]);

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("Error creating ad item:", error);
    return NextResponse.json(
      { error: "Failed to create ad item", message: error.message },
      { status: 500 }
    );
  }
}

