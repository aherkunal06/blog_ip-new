// src/app/api/admin/site-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
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

    const settings = await query<Array<{
      id: number;
      key_name: string;
      value: string | null;
      type: string;
      description: string | null;
    }>>(
      'SELECT id, key_name, value, type, description FROM SiteSettings ORDER BY key_name ASC'
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error fetching site settings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch site settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
    const { settings: settingsToUpdate } = body;

    if (!settingsToUpdate || typeof settingsToUpdate !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid settings data" },
        { status: 400 }
      );
    }

    // Update each setting
    for (const [key, value] of Object.entries(settingsToUpdate)) {
      await execute(
        'UPDATE SiteSettings SET value = ? WHERE key_name = ?',
        [value as string, key]
      );
    }

    // Fetch updated settings
    const updatedSettings = await query<Array<{
      id: number;
      key_name: string;
      value: string | null;
      type: string;
      description: string | null;
    }>>(
      'SELECT id, key_name, value, type, description FROM SiteSettings ORDER BY key_name ASC'
    );

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("Error updating site settings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update site settings" },
      { status: 500 }
    );
  }
}

