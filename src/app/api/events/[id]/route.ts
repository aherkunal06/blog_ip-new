// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface EventParams {
  params: Promise<{ id: string }>;
}

// GET /api/events/[id] - Get single event
export async function GET(request: Request, { params }: EventParams) {
  try {
    const { id } = await params;
    const event = await queryOne(`SELECT * FROM Event WHERE id = ?`, [id]);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update event
export async function PUT(req: NextRequest, { params }: EventParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(body[key]);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateValues.push(id);

    await execute(
      `UPDATE Event SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const event = await queryOne(`SELECT * FROM Event WHERE id = ?`, [id]);

    return NextResponse.json(event);
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(req: NextRequest, { params }: EventParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await execute(`DELETE FROM Event WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event", message: error.message },
      { status: 500 }
    );
  }
}

