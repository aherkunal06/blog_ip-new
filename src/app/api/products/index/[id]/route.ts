// app/api/products/index/[id]/route.ts
// ProductIndex management (synced products)

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface ProductIndexParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/index/[id] - Get single indexed product
export async function GET(request: Request, { params }: ProductIndexParams) {
  try {
    const { id } = await params;
    const product = await queryOne(
      `SELECT * FROM ProductIndex WHERE id = ?`,
      [id]
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/products/index/[id] - Update indexed product
export async function PUT(req: NextRequest, { params }: ProductIndexParams) {
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
      "name",
      "slug",
      "image",
      "price",
      "salePrice",
      "description",
      "category",
      "categoryId",
      "tags",
      "stockStatus",
      "rating",
      "reviewCount",
      "popularityScore",
      "adminPriority",
      "ipshopyUrl",
      "syncStatus",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        if (field === "tags" && Array.isArray(body[field])) {
          updateValues.push(JSON.stringify(body[field]));
        } else {
          updateValues.push(body[field]);
        }
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
      `UPDATE ProductIndex SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const product = await queryOne(
      `SELECT * FROM ProductIndex WHERE id = ?`,
      [id]
    );

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product", message: error.message },
      { status: 500 }
    );
  }
}

