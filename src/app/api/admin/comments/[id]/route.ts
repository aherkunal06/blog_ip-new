// src/app/api/admin/comments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

// DELETE comment
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const commentId = parseInt(id, 10);

    if (isNaN(commentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid comment ID" },
        { status: 400 }
      );
    }

    // Check if comment exists
    const comment = await queryOne<{ id: number }>(
      'SELECT id FROM Comment WHERE id = ?',
      [commentId]
    );

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    // Delete comment (CASCADE will delete replies)
    await execute('DELETE FROM Comment WHERE id = ?', [commentId]);

    return NextResponse.json({ success: true, message: "Comment deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}

// PATCH - Block/Unblock comment or update status
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const commentId = parseInt(id, 10);

    if (isNaN(commentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid comment ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, status } = body; // action: "block" | "unblock" | "updateStatus"

    if (action === "block") {
      await execute('UPDATE Comment SET isBlocked = TRUE WHERE id = ?', [commentId]);
      return NextResponse.json({ success: true, message: "Comment blocked successfully" });
    } else if (action === "unblock") {
      await execute('UPDATE Comment SET isBlocked = FALSE WHERE id = ?', [commentId]);
      return NextResponse.json({ success: true, message: "Comment unblocked successfully" });
    } else if (action === "updateStatus" && status) {
      await execute('UPDATE Comment SET status = ? WHERE id = ?', [status, commentId]);
      return NextResponse.json({ success: true, message: "Comment status updated successfully" });
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action or missing parameters" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update comment" },
      { status: 500 }
    );
  }
}


