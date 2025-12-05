// src/app/api/admin/comments/block-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, insert } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

// POST - Block user from commenting
export async function POST(req: NextRequest) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // Get admin user ID from token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminUserId = token.id as number;

    // Check if user exists
    const user = await queryOne<{ id: number }>(
      'SELECT id FROM User WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already blocked
    const existingBlock = await queryOne<{ id: number }>(
      'SELECT id FROM UserBlockedComment WHERE userId = ?',
      [userId]
    );

    if (existingBlock) {
      return NextResponse.json(
        { success: false, message: "User is already blocked from commenting" },
        { status: 400 }
      );
    }

    // Block user
    await insert(
      'INSERT INTO UserBlockedComment (userId, blockedBy, reason) VALUES (?, ?, ?)',
      [userId, adminUserId, reason || null]
    );

    return NextResponse.json({ success: true, message: "User blocked from commenting successfully" });
  } catch (error: any) {
    console.error("Error blocking user:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, message: "User is already blocked from commenting" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to block user" },
      { status: 500 }
    );
  }
}

// DELETE - Unblock user from commenting
export async function DELETE(req: NextRequest) {
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Check if user is blocked
    const existingBlock = await queryOne<{ id: number }>(
      'SELECT id FROM UserBlockedComment WHERE userId = ?',
      [userIdNum]
    );

    if (!existingBlock) {
      return NextResponse.json(
        { success: false, message: "User is not blocked from commenting" },
        { status: 404 }
      );
    }

    // Unblock user
    await execute('DELETE FROM UserBlockedComment WHERE userId = ?', [userIdNum]);

    return NextResponse.json({ success: true, message: "User unblocked from commenting successfully" });
  } catch (error: any) {
    console.error("Error unblocking user:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to unblock user" },
      { status: 500 }
    );
  }
}


