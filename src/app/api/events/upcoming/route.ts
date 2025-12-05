// app/api/events/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/events/upcoming - Get upcoming events
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "3");
    const featured = searchParams.get("featured") === "true";

    // First, let's check all events to debug
    const allEvents = await query(`SELECT id, title, status, featured, startDate, endDate FROM Event`);
    console.log(`[Events API] Total events in DB: ${(allEvents as any[]).length}`);
    (allEvents as any[]).forEach((event: any) => {
      console.log(`[Events API] Event: ${event.title}, status: ${event.status}, featured: ${event.featured} (type: ${typeof event.featured}), startDate: ${event.startDate}`);
    });

    // Build WHERE clause - MySQL BOOLEAN is stored as TINYINT(1), so we check for 1
    // Use DATE() to compare dates only, ignoring time component
    // Handle both 'upcoming' status and empty/null status (treat empty as upcoming)
    // Compare dates - use >= to include today's events
    let whereClause = "WHERE (status = 'upcoming' OR status IS NULL OR status = '') AND startDate >= CURDATE()";
    const params: any[] = [];
    
    if (featured) {
      // MySQL BOOLEAN is TINYINT(1) - check for any truthy value (1, TRUE, or non-zero)
      // Using CAST to ensure we're comparing as boolean
      whereClause += " AND CAST(featured AS UNSIGNED) = 1";
    }

    whereClause += " ORDER BY startDate ASC LIMIT ?";
    params.push(limit);

    const events = await query(
      `SELECT * FROM Event 
       ${whereClause}`,
      params
    ) || [];

    // Log for debugging
    console.log(`[Events API] Query: ${whereClause}, Params: [${params.join(', ')}]`);
    console.log(`[Events API] Found ${(events as any[]).length} events`);
    if ((events as any[]).length > 0) {
      (events as any[]).forEach((event: any) => {
        console.log(`[Events API] Matched event:`, {
          id: event.id,
          title: event.title,
          status: event.status,
          featured: event.featured,
          featuredType: typeof event.featured,
          startDate: event.startDate
        });
      });
    } else {
      console.log(`[Events API] No events matched the criteria. Checking why...`);
      // Check what CURDATE() returns
      const currentDate = await query(`SELECT CURDATE() as currentDate, NOW() as currentTime`);
      console.log(`[Events API] Current date/time:`, currentDate);
      
      // Check events without featured filter
      const eventsWithoutFeatured = await query(
        `SELECT * FROM Event WHERE (status = 'upcoming' OR status IS NULL OR status = '') AND DATE(startDate) >= CURDATE() ORDER BY startDate ASC LIMIT ?`,
        [limit]
      );
      console.log(`[Events API] Events without featured filter: ${(eventsWithoutFeatured as any[]).length}`);
      
      // Check all upcoming events regardless of date
      const allUpcoming = await query(
        `SELECT * FROM Event WHERE status = 'upcoming' OR status IS NULL OR status = '' ORDER BY startDate ASC`
      );
      console.log(`[Events API] All events with upcoming status: ${(allUpcoming as any[]).length}`);
    }

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching upcoming events:", error);
    // Return empty result instead of error to prevent frontend crashes
    return NextResponse.json({ events: [] });
  }
}

