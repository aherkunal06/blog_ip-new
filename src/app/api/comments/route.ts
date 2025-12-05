// src/app/api/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

// GET comments for a blog with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blogId = searchParams.get("blogId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    if (!blogId) {
      return NextResponse.json(
        { success: false, message: "Blog ID is required" },
        { status: 400 }
      );
    }

    const blogIdNum = parseInt(blogId, 10);
    if (isNaN(blogIdNum)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID" },
        { status: 400 }
      );
    }

    // Get top-level comments (parentId IS NULL) that are approved and not blocked
    const comments = await query<Array<{
      id: number;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      userId: number;
      userName: string;
      userEmail: string;
      userImage: string | null;
    }>>(
      `SELECT 
        c.id,
        c.content,
        c.createdAt,
        c.updatedAt,
        u.id as userId,
        u.name as userName,
        u.email as userEmail,
        u.image as userImage
      FROM Comment c
      INNER JOIN User u ON c.userId = u.id
      WHERE c.blogId = ? 
        AND c.parentId IS NULL 
        AND c.status = 'approved' 
        AND c.isBlocked = FALSE
      ORDER BY c.createdAt DESC
      LIMIT ? OFFSET ?`,
      [blogIdNum, limit, skip]
    );

    // Get total count
    const countResult = await queryOne<{ count: bigint }>(
      `SELECT COUNT(*) as count
       FROM Comment
       WHERE blogId = ? 
         AND parentId IS NULL 
         AND status = 'approved' 
         AND isBlocked = FALSE`,
      [blogIdNum]
    );

    const total = Number(countResult?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Get replies for each comment
    const commentIds = comments.map((c) => c.id);
    let replies: Array<{
      id: number;
      content: string;
      createdAt: Date;
      parentId: number;
      userId: number;
      userName: string;
      userEmail: string;
      userImage: string | null;
      isAdminReply: boolean;
    }> = [];

    if (commentIds.length > 0) {
      replies = await query<Array<{
        id: number;
        content: string;
        createdAt: Date;
        parentId: number;
        userId: number;
        userName: string;
        userEmail: string;
        userImage: string | null;
        isAdminReply: boolean;
      }>>(
        `SELECT 
          c.id,
          c.content,
          c.createdAt,
          c.parentId,
          u.id as userId,
          u.name as userName,
          u.email as userEmail,
          u.image as userImage,
          CASE WHEN au.id IS NOT NULL THEN TRUE ELSE FALSE END as isAdminReply
        FROM Comment c
        INNER JOIN User u ON c.userId = u.id
        LEFT JOIN AdminUser au ON u.email = au.email
        WHERE c.parentId IN (${commentIds.map(() => '?').join(',')})
          AND c.status = 'approved' 
          AND c.isBlocked = FALSE
        ORDER BY c.createdAt ASC`,
        commentIds
      );
    }

    // Group replies by parent comment
    const repliesByParent = replies.reduce((acc, reply) => {
      if (!acc[reply.parentId]) {
        acc[reply.parentId] = [];
      }
      acc[reply.parentId].push({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        user: {
          id: reply.userId,
          name: reply.userName,
          email: reply.userEmail,
          image: reply.userImage,
        },
        isAdminReply: reply.isAdminReply,
      });
      return acc;
    }, {} as Record<number, any[]>);

    const formattedComments = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: {
        id: c.userId,
        name: c.userName,
        email: c.userEmail,
        image: c.userImage,
      },
      replies: repliesByParent[c.id] || [],
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
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Create new comment or reply
export async function POST(req: NextRequest) {
  try {
    // Get token from user auth session
    // The user auth uses /api/auth/user/[...nextauth], so we need to get the token
    // Try with the default cookie name first
    let token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // If not found, try with explicit cookie name
    if (!token || !token.id) {
      token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: 'next-auth.session-token',
      });
    }
    
    // Debug: Log token info
    console.log('Token check:', {
      hasToken: !!token,
      tokenId: token?.id,
      tokenSub: token?.sub,
      tokenEmail: token?.email,
    });
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login to comment." },
        { status: 401 }
      );
    }

    // Try to get user ID from token
    // The token might have id, sub, or we need to look it up by email
    let userId: number | null = null;
    
    if (token.id) {
      userId = typeof token.id === 'string' ? parseInt(token.id, 10) : token.id;
    } else if (token.sub) {
      // Sometimes the user ID is in the 'sub' field
      userId = typeof token.sub === 'string' ? parseInt(token.sub, 10) : token.sub;
    } else if (token.email) {
      // If we have email, look up the user ID
      const user = await queryOne<{ id: number }>(
        'SELECT id FROM User WHERE email = ?',
        [token.email]
      );
      if (user) {
        userId = user.id;
      }
    }
    
    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user session. Please login again." },
        { status: 401 }
      );
    }

    // Check if user is blocked from commenting
    const isBlocked = await queryOne<{ id: number }>(
      'SELECT id FROM UserBlockedComment WHERE userId = ?',
      [userId]
    );

    if (isBlocked) {
      return NextResponse.json(
        { success: false, message: "You are blocked from commenting." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { blogId, content, parentId } = body;

    if (!blogId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Blog ID and content are required" },
        { status: 400 }
      );
    }

    const blogIdNum = parseInt(blogId, 10);
    if (isNaN(blogIdNum)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID" },
        { status: 400 }
      );
    }

    // Verify blog exists
    const blog = await queryOne<{ id: number }>(
      'SELECT id FROM Blog WHERE id = ?',
      [blogIdNum]
    );

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // If parentId is provided, verify parent comment exists and belongs to same blog
    if (parentId) {
      const parentIdNum = parseInt(parentId, 10);
      if (!isNaN(parentIdNum)) {
        const parentComment = await queryOne<{ id: number; blogId: number }>(
          'SELECT id, blogId FROM Comment WHERE id = ?',
          [parentIdNum]
        );

        if (!parentComment) {
          return NextResponse.json(
            { success: false, message: "Parent comment not found" },
            { status: 404 }
          );
        }

        if (parentComment.blogId !== blogIdNum) {
          return NextResponse.json(
            { success: false, message: "Parent comment does not belong to this blog" },
            { status: 400 }
          );
        }
      }
    }

    // Insert comment
    const commentId = await insert(
      'INSERT INTO Comment (content, blogId, userId, parentId, status) VALUES (?, ?, ?, ?, ?)',
      [content.trim(), blogIdNum, userId, parentId ? parseInt(parentId, 10) : null, 'approved']
    );

    // Fetch created comment with user details
    const newComment = await queryOne<{
      id: number;
      content: string;
      createdAt: Date;
      parentId: number | null;
      userId: number;
      userName: string;
      userEmail: string;
      userImage: string | null;
      isAdminReply: boolean;
    }>(
      `SELECT 
        c.id,
        c.content,
        c.createdAt,
        c.parentId,
        u.id as userId,
        u.name as userName,
        u.email as userEmail,
        u.image as userImage,
        CASE WHEN au.id IS NOT NULL THEN TRUE ELSE FALSE END as isAdminReply
      FROM Comment c
      INNER JOIN User u ON c.userId = u.id
      LEFT JOIN AdminUser au ON u.email = au.email
      WHERE c.id = ?`,
      [commentId]
    );

    if (!newComment) {
      return NextResponse.json(
        { success: false, message: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.createdAt.toISOString(),
        parentId: newComment.parentId,
        user: {
          id: newComment.userId,
          name: newComment.userName,
          email: newComment.userEmail,
          image: newComment.userImage,
        },
        isAdminReply: newComment.isAdminReply,
      },
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

