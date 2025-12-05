// src/app/api/site-settings/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public endpoint - no authentication required
export async function GET(req: NextRequest) {
  try {
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
    console.error("Error fetching public site settings:", error);
    // Return empty settings on error, client will use defaults
    return NextResponse.json({ success: true, settings: [] });
  }
}

