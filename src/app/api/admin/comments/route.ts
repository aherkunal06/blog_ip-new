// src/app/api/admin/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status"); // "approved", "blocked", "all"
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    // Build query
    let sql = `
      SELECT 
        c.id,
        c.content,
        c.status,
        c.isBlocked,
        c.parentId,
        c.createdAt,
        c.updatedAt,
        b.id as blogId,
        b.title as blogTitle,
        b.slug as blogSlug,
        u.id as userId,
        u.name as userName,
        u.email as userEmail,
        u.image as userImage,
        COUNT(c2.id) as replyCount
      FROM Comment c
      INNER JOIN Blog b ON c.blogId = b.id
      INNER JOIN User u ON c.userId = u.id
      LEFT JOIN Comment c2 ON c2.parentId = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== "all") {
      if (status === "blocked") {
        sql += ` AND c.isBlocked = TRUE`;
      } else {
        sql += ` AND c.status = ? AND c.isBlocked = FALSE`;
        params.push(status);
      }
    }

    if (search) {
      sql += ` AND (c.content LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR b.title LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` GROUP BY c.id, c.content, c.status, c.isBlocked, c.parentId, c.createdAt, c.updatedAt, b.id, b.title, b.slug, u.id, u.name, u.email, u.image`;
    sql += ` ORDER BY c.createdAt DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, skip);

    const comments = await query<Array<{
      id: number;
      content: string;
      status: string;
      isBlocked: boolean;
      parentId: number | null;
      createdAt: Date;
      updatedAt: Date;
      blogId: number;
      blogTitle: string;
      blogSlug: string;
      userId: number;
      userName: string;
      userEmail: string;
      userImage: string | null;
      replyCount: bigint;
    }>>(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM Comment c
      INNER JOIN Blog b ON c.blogId = b.id
      INNER JOIN User u ON c.userId = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (status && status !== "all") {
      if (status === "blocked") {
        countSql += ` AND c.isBlocked = TRUE`;
      } else {
        countSql += ` AND c.status = ? AND c.isBlocked = FALSE`;
        countParams.push(status);
      }
    }

    if (search) {
      countSql += ` AND (c.content LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR b.title LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await queryOne<{ total: bigint }>(countSql, countParams);
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Get statistics
    const stats = await query<Array<{ status: string; count: bigint }>>(
      `SELECT 
        CASE 
          WHEN isBlocked = TRUE THEN 'blocked'
          WHEN status = 'approved' THEN 'approved'
          ELSE 'pending'
        END as status,
        COUNT(*) as count
      FROM Comment
      GROUP BY status, isBlocked`
    );

    const totalComments = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Comment'
    );

    const approvedComments = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Comment WHERE status = ? AND isBlocked = FALSE',
      ['approved']
    );

    const blockedComments = await queryOne<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM Comment WHERE isBlocked = TRUE'
    );

    const formattedComments = comments.map((c) => ({
      id: c.id,
      content: c.content,
      status: c.status,
      isBlocked: c.isBlocked,
      parentId: c.parentId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      blog: {
        id: c.blogId,
        title: c.blogTitle,
        slug: c.blogSlug,
      },
      user: {
        id: c.userId,
        name: c.userName,
        email: c.userEmail,
        image: c.userImage,
      },
      replyCount: Number(c.replyCount),
    }));

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        total: Number(totalComments?.count || 0),
        approved: Number(approvedComments?.count || 0),
        blocked: Number(blockedComments?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}


