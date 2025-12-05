// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// GET /api/products - Get all products with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active";
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let sql = "SELECT * FROM Product WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    if (featured === "true") {
      sql += " AND featured = TRUE";
    }

    sql += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const products = await query(sql, params);

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM Product WHERE 1=1";
    const countParams: any[] = [];
    if (status) {
      countSql += " AND status = ?";
      countParams.push(status);
    }
    if (category) {
      countSql += " AND category = ?";
      countParams.push(category);
    }
    if (featured === "true") {
      countSql += " AND featured = TRUE";
    }

    const countResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = countResult?.total || 0;

    return NextResponse.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      status = "active",
      rating = 0,
      reviewCount = 0,
    } = body;

    if (!name || !slug || !ipshopyUrl) {
      return NextResponse.json(
        { error: "Name, slug, and ipshopyUrl are required" },
        { status: 400 }
      );
    }

    const insertId = await insert(
      `INSERT INTO Product (name, slug, image, price, salePrice, description, category, ipshopyUrl, status, rating, reviewCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        image || null,
        price || null,
        salePrice || null,
        description || null,
        category || null,
        ipshopyUrl,
        status,
        rating,
        reviewCount,
      ]
    );

    const product = await queryOne(`SELECT * FROM Product WHERE id = ?`, [insertId]);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Product with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create product", message: error.message },
      { status: 500 }
    );
  }
}

