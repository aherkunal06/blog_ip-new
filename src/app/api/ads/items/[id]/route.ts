// app/api/ads/items/[id]/route.ts
// Single ad item operations

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface AdItemParams {
  params: Promise<{ id: string }>;
}

// GET /api/ads/items/[id] - Get single ad item
export async function GET(request: Request, { params }: AdItemParams) {
  try {
    const { id } = await params;
    const item = await queryOne(`SELECT * FROM AdItem WHERE id = ?`, [id]);

    if (!item) {
      return NextResponse.json({ error: "Ad item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Error fetching ad item:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad item", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/ads/items/[id] - Update ad item
export async function PUT(req: NextRequest, { params }: AdItemParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      "productIndexId",
      "productUrl",
      "productName",
      "productImage",
      "productPrice",
      "productSalePrice",
      "productDescription",
      "productCategory",
      "title",
      "description",
      "ctaText",
      "displayOrder",
      "weight",
      "adminPriority",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updateValues.push(id);

    await execute(
      `UPDATE AdItem SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const item = await queryOne(`SELECT * FROM AdItem WHERE id = ?`, [id]);

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Error updating ad item:", error);
    return NextResponse.json(
      { error: "Failed to update ad item", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/ads/items/[id] - Delete ad item
export async function DELETE(req: NextRequest, { params }: AdItemParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await execute(`DELETE FROM AdItem WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Ad item deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting ad item:", error);
    return NextResponse.json(
      { error: "Failed to delete ad item", message: error.message },
      { status: 500 }
    );
  }
}

