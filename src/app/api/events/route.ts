// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// GET /api/events - Get all events with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let sql = "SELECT * FROM Event WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (featured === "true") {
      sql += " AND featured = TRUE";
    }

    // Filter upcoming events (startDate > NOW())
    if (status === "upcoming") {
      sql += " AND startDate > NOW()";
    }

    sql += " ORDER BY startDate ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const events = await query(sql, params);

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM Event WHERE 1=1";
    const countParams: any[] = [];
    if (status) {
      countSql += " AND status = ?";
      countParams.push(status);
    }
    if (featured === "true") {
      countSql += " AND featured = TRUE";
    }
    if (status === "upcoming") {
      countSql += " AND startDate > NOW()";
    }

    const countResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = countResult?.total || 0;

    return NextResponse.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      slug,
      description,
      image,
      startDate,
      endDate,
      location,
      eventUrl,
      status = "upcoming",
      featured = false,
    } = body;

    if (!title || !slug || !startDate) {
      return NextResponse.json(
        { error: "Title, slug, and startDate are required" },
        { status: 400 }
      );
    }

    const insertId = await insert(
      `INSERT INTO Event (title, slug, description, image, startDate, endDate, location, eventUrl, status, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        description || null,
        image || null,
        startDate,
        endDate || null,
        location || null,
        eventUrl || null,
        status,
        featured,
      ]
    );

    const event = await queryOne(`SELECT * FROM Event WHERE id = ?`, [insertId]);

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error("Error creating event:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Event with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create event", message: error.message },
      { status: 500 }
    );
  }
}

