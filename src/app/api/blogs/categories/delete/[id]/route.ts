import { execute } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ids = id.split(',').map(Number).filter(n => !isNaN(n));
    
    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid ID(s)" }, { status: 400 });
    }

    // Delete categories (cascade will handle related records in BlogCategory)
    const placeholders = ids.map(() => '?').join(',');
    const affectedRows = await execute(
      `DELETE FROM Category WHERE id IN (${placeholders})`,
      ids
    );

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Category(ies) not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedCount: affectedRows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to delete category(ies)" }, { status: 500 });
  }
}

