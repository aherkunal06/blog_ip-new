// app/api/ads/campaigns/[id]/route.ts
// Single campaign operations

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface CampaignParams {
  params: Promise<{ id: string }>;
}

// GET /api/ads/campaigns/[id] - Get single campaign
export async function GET(request: Request, { params }: CampaignParams) {
  try {
    const { id } = await params;
    const campaign = await queryOne(`SELECT * FROM AdCampaign WHERE id = ?`, [
      id,
    ]);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    if (campaign.targetCategories) {
      campaign.targetCategories = JSON.parse(campaign.targetCategories);
    }
    if (campaign.targetBlogs) {
      campaign.targetBlogs = JSON.parse(campaign.targetBlogs);
    }
    if (campaign.targetKeywords) {
      campaign.targetKeywords = JSON.parse(campaign.targetKeywords);
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/ads/campaigns/[id] - Update campaign
export async function PUT(req: NextRequest, { params }: CampaignParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      "name",
      "description",
      "type",
      "status",
      "startDate",
      "endDate",
      "targetType",
      "targetCategories",
      "targetBlogs",
      "targetKeywords",
      "priority",
      "defaultPriority",
      "priorityBoost",
      "maxImpressions",
      "maxClicks",
      "rotationType",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        if (
          field === "targetCategories" ||
          field === "targetBlogs" ||
          field === "targetKeywords"
        ) {
          updateValues.push(
            body[field] ? JSON.stringify(body[field]) : null
          );
        } else {
          updateValues.push(body[field]);
        }
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updateValues.push(id);

    await execute(
      `UPDATE AdCampaign SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const campaign = await queryOne(`SELECT * FROM AdCampaign WHERE id = ?`, [
      id,
    ]);

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/ads/campaigns/[id] - Delete campaign
export async function DELETE(req: NextRequest, { params }: CampaignParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await execute(`DELETE FROM AdCampaign WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign", message: error.message },
      { status: 500 }
    );
  }
}

