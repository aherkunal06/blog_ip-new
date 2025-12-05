// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface ProductParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Get single product
export async function GET(request: Request, { params }: ProductParams) {
  try {
    const { id } = await params;
    const product = await queryOne(`SELECT * FROM Product WHERE id = ?`, [id]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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

// PUT /api/products/[id] - Update product
export async function PUT(req: NextRequest, { params }: ProductParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      slug,
      image,
      price,
      salePrice,
      description,
      category,
      ipshopyUrl,
      status,
      rating,
      reviewCount,
    } = body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }
    if (slug !== undefined) {
      updateFields.push("slug = ?");
      updateValues.push(slug);
    }
    if (image !== undefined) {
      updateFields.push("image = ?");
      updateValues.push(image);
    }
    if (price !== undefined) {
      updateFields.push("price = ?");
      updateValues.push(price);
    }
    if (salePrice !== undefined) {
      updateFields.push("salePrice = ?");
      updateValues.push(salePrice);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push("category = ?");
      updateValues.push(category);
    }
    if (ipshopyUrl !== undefined) {
      updateFields.push("ipshopyUrl = ?");
      updateValues.push(ipshopyUrl);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }
    if (rating !== undefined) {
      updateFields.push("rating = ?");
      updateValues.push(rating);
    }
    if (reviewCount !== undefined) {
      updateFields.push("reviewCount = ?");
      updateValues.push(reviewCount);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateValues.push(id);

    await execute(
      `UPDATE Product SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const product = await queryOne(`SELECT * FROM Product WHERE id = ?`, [id]);

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(req: NextRequest, { params }: ProductParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await execute(`DELETE FROM Product WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product", message: error.message },
      { status: 500 }
    );
  }
}

