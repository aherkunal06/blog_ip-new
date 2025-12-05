import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

interface BlogExport {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  imageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  status: boolean;
  authorId: number;
  authorUsername: string;
  authorName: string;
  categories: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  try {
    // Check route permissions for admin users only
    const permCheck = await checkApiRoutePermission(req);
    if (permCheck.userId && !permCheck.allowed) {
      return NextResponse.json(
        { error: "Unauthorized: Insufficient permissions for this route" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json"; // json or csv
    const status = url.searchParams.get("status"); // all, approved, pending
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Build WHERE clause
    let whereClause = "";
    const params: any[] = [];

    if (status && status !== "all") {
      whereClause += " AND b.status = ?";
      params.push(status === "approved" ? 1 : 0);
    }

    if (startDate) {
      whereClause += " AND b.createdAt >= ?";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND b.createdAt <= ?";
      params.push(endDate);
    }

    // Fetch blogs with categories
    const blogs = await query<Array<{
      id: number;
      title: string;
      slug: string;
      content: string;
      image: string | null;
      imageAlt: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      metaKeywords: string | null;
      status: boolean;
      authorId: number;
      authorUsername: string;
      authorName: string;
      createdAt: Date;
      updatedAt: Date;
    }>>(
      `SELECT 
        b.id, b.title, b.slug, b.content, b.image, b.imageAlt,
        b.metaTitle, b.metaDescription, b.metaKeywords, b.status,
        b.authorId, u.username as authorUsername, u.name as authorName,
        b.createdAt, b.updatedAt
       FROM Blog b
       JOIN AdminUser u ON b.authorId = u.id
       WHERE 1=1 ${whereClause}
       ORDER BY b.createdAt DESC`,
      params
    );

    // Get categories for each blog
    const blogIds = blogs.map((b) => b.id);
    const categories = blogIds.length > 0
      ? await query<Array<{
          blogId: number;
          categoryName: string;
        }>>(
          `SELECT bc.blogId, c.name as categoryName
           FROM BlogCategory bc
           JOIN Category c ON bc.categoryId = c.id
           WHERE bc.blogId IN (${blogIds.map(() => "?").join(",")})`,
          blogIds
        )
      : [];

    // Group categories by blogId
    const categoriesByBlog = categories.reduce((acc, cat) => {
      if (!acc[cat.blogId]) acc[cat.blogId] = [];
      acc[cat.blogId].push(cat.categoryName);
      return acc;
    }, {} as Record<number, string[]>);

    // Format blogs for export
    const exportData: BlogExport[] = blogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      image: blog.image,
      imageAlt: blog.imageAlt,
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      metaKeywords: blog.metaKeywords,
      status: blog.status,
      authorId: blog.authorId,
      authorUsername: blog.authorUsername,
      authorName: blog.authorName,
      categories: (categoriesByBlog[blog.id] || []).join(", "),
      createdAt: blog.createdAt.toISOString(),
      updatedAt: blog.updatedAt.toISOString(),
    }));

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Title",
        "Slug",
        "Content",
        "Image URL",
        "Image Alt",
        "Meta Title",
        "Meta Description",
        "Meta Keywords",
        "Status",
        "Author ID",
        "Author Username",
        "Author Name",
        "Categories",
        "Created At",
        "Updated At",
      ];

      const csvRows = [
        headers.join(","),
        ...exportData.map((blog) => {
          const escapeCSV = (str: string | null) => {
            if (str === null || str === undefined) return "";
            const stringValue = String(str);
            // Escape quotes and wrap in quotes if contains comma, newline, or quote
            if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          };

          return [
            blog.id,
            escapeCSV(blog.title),
            escapeCSV(blog.slug),
            escapeCSV(blog.content),
            escapeCSV(blog.image),
            escapeCSV(blog.imageAlt),
            escapeCSV(blog.metaTitle),
            escapeCSV(blog.metaDescription),
            escapeCSV(blog.metaKeywords),
            blog.status ? "Approved" : "Pending",
            blog.authorId,
            escapeCSV(blog.authorUsername),
            escapeCSV(blog.authorName),
            escapeCSV(blog.categories),
            escapeCSV(blog.createdAt),
            escapeCSV(blog.updatedAt),
          ].join(",");
        }),
      ];

      const csv = csvRows.join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="blogs-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json(
        {
          success: true,
          count: exportData.length,
          data: exportData,
        },
        {
          headers: {
            "Content-Disposition": `attachment; filename="blogs-export-${new Date().toISOString().split("T")[0]}.json"`,
          },
        }
      );
    }
  } catch (error: any) {
    console.error("Error exporting blogs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export blogs", message: error.message },
      { status: 500 }
    );
  }
}

