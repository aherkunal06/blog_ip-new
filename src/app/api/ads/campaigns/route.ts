// app/api/ads/campaigns/route.ts
// Ad campaign management API

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// GET /api/ads/campaigns - List all campaigns
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let sql = "SELECT * FROM AdCampaign WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    sql += " ORDER BY priority DESC, createdAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const campaigns = await query(sql, params);

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM AdCampaign WHERE 1=1";
    const countParams: any[] = [];
    if (status) {
      countSql += " AND status = ?";
      countParams.push(status);
    }
    if (type) {
      countSql += " AND type = ?";
      countParams.push(type);
    }

    const countResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = countResult?.total || 0;

    return NextResponse.json({
      campaigns,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/ads/campaigns - Create new campaign
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      type = "product",
      status = "draft",
      startDate,
      endDate,
      targetType = "all",
      targetCategories,
      targetBlogs,
      targetKeywords,
      priority = 0,
      defaultPriority = 50,
      priorityBoost = 1.0,
      maxImpressions,
      maxClicks,
      rotationType = "random",
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    const insertId = await insert(
      `INSERT INTO AdCampaign (
        name, description, type, status, startDate, endDate,
        targetType, targetCategories, targetBlogs, targetKeywords,
        priority, defaultPriority, priorityBoost,
        maxImpressions, maxClicks, rotationType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        type,
        status,
        startDate || null,
        endDate || null,
        targetType,
        targetCategories ? JSON.stringify(targetCategories) : null,
        targetBlogs ? JSON.stringify(targetBlogs) : null,
        targetKeywords ? JSON.stringify(targetKeywords) : null,
        priority,
        defaultPriority,
        priorityBoost,
        maxImpressions || null,
        maxClicks || null,
        rotationType,
      ]
    );

    const campaign = await queryOne(`SELECT * FROM AdCampaign WHERE id = ?`, [
      insertId,
    ]);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", message: error.message },
      { status: 500 }
    );
  }
}

