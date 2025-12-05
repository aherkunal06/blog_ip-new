// app/api/products/index/route.ts
// ProductIndex listing (synced products)

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/products/index - Get all indexed products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active";
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    const search = searchParams.get("search");

    // Handle comparison operators for adminPriority
    const adminPriorityGte = searchParams.get("adminPriority>=") || searchParams.get("adminPriority%3E=");
    const adminPriorityGt = searchParams.get("adminPriority>") || searchParams.get("adminPriority%3E");
    const adminPriorityLte = searchParams.get("adminPriority<=") || searchParams.get("adminPriority%3C=");
    const adminPriorityLt = searchParams.get("adminPriority<") || searchParams.get("adminPriority%3C");
    const adminPriorityEq = searchParams.get("adminPriority");

    let sql = "SELECT * FROM ProductIndex WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND syncStatus = ?";
      params.push(status);
    }

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    // Handle adminPriority comparisons
    if (adminPriorityGte) {
      sql += " AND adminPriority >= ?";
      params.push(parseInt(adminPriorityGte));
    } else if (adminPriorityGt) {
      sql += " AND adminPriority > ?";
      params.push(parseInt(adminPriorityGt));
    } else if (adminPriorityLte) {
      sql += " AND adminPriority <= ?";
      params.push(parseInt(adminPriorityLte));
    } else if (adminPriorityLt) {
      sql += " AND adminPriority < ?";
      params.push(parseInt(adminPriorityLt));
    } else if (adminPriorityEq) {
      sql += " AND adminPriority = ?";
      params.push(parseInt(adminPriorityEq));
    }

    if (search) {
      sql += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += " ORDER BY adminPriority DESC, popularityScore DESC, createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const products = (await query(sql, params)) || [];

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM ProductIndex WHERE 1=1";
    const countParams: any[] = [];
    if (status) {
      countSql += " AND syncStatus = ?";
      countParams.push(status);
    }
    if (category) {
      countSql += " AND category = ?";
      countParams.push(category);
    }

    // Handle adminPriority comparisons in count query
    if (adminPriorityGte) {
      countSql += " AND adminPriority >= ?";
      countParams.push(parseInt(adminPriorityGte));
    } else if (adminPriorityGt) {
      countSql += " AND adminPriority > ?";
      countParams.push(parseInt(adminPriorityGt));
    } else if (adminPriorityLte) {
      countSql += " AND adminPriority <= ?";
      countParams.push(parseInt(adminPriorityLte));
    } else if (adminPriorityLt) {
      countSql += " AND adminPriority < ?";
      countParams.push(parseInt(adminPriorityLt));
    } else if (adminPriorityEq) {
      countSql += " AND adminPriority = ?";
      countParams.push(parseInt(adminPriorityEq));
    }

    if (search) {
      countSql += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
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
    console.error("Error fetching indexed products:", error);
    // Return empty result instead of error to prevent frontend crashes
    return NextResponse.json({
      products: [],
      totalPages: 0,
      currentPage: 1,
      total: 0,
    });
  }
}

