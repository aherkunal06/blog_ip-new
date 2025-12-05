import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, insert, transaction, connInsert, connExecute, connQuery } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface BlogImport {
  title: string;
  slug?: string;
  content: string;
  image?: string | null;
  imageAlt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  status?: boolean;
  categories?: string; // Comma-separated category names
  createdAt?: string;
}

/**
 * Validate and ensure unique slug
 */
async function ensureUniqueSlug(slug: string, excludeId?: number): Promise<string> {
  let uniqueSlug = slug;
  let counter = 1;

  while (true) {
    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM Blog WHERE slug = ?${excludeId ? " AND id != ?" : ""}`,
      excludeId ? [uniqueSlug, excludeId] : [uniqueSlug]
    );

    if (!existing) {
      return uniqueSlug;
    }

    // Append counter to make unique
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
}

/**
 * Get or create category by name
 */
async function getOrCreateCategory(conn: any, categoryName: string): Promise<number> {
  const trimmedName = categoryName.trim();
  if (!trimmedName) {
    throw new Error("Category name cannot be empty");
  }

  // Check if category exists
  const existing = await connQuery<Array<{ id: number }>>(
    conn,
    `SELECT id FROM Category WHERE name = ? OR slug = ?`,
    [trimmedName, slugify(trimmedName)]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new category
  const categoryId = await connInsert(
    conn,
    `INSERT INTO Category (name, slug, status) VALUES (?, ?, FALSE)`,
    [trimmedName, slugify(trimmedName)]
  );

  return categoryId;
}

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

    const session = await auth();
    const sessionUserId = (session?.user as any)?.id;

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = formData.get("format") as string || "json"; // json or csv
    const skipDuplicates = formData.get("skipDuplicates") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    let blogs: BlogImport[] = [];

    // Parse based on format
    if (format === "csv") {
      // Parse CSV
      const lines = fileContent.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        return NextResponse.json(
          { success: false, message: "CSV file must have at least a header row and one data row" },
          { status: 400 }
        );
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const titleIndex = headers.findIndex((h) => h.toLowerCase() === "title");
      const slugIndex = headers.findIndex((h) => h.toLowerCase() === "slug");
      const contentIndex = headers.findIndex((h) => h.toLowerCase() === "content");
      const imageIndex = headers.findIndex((h) => h.toLowerCase() === "image url" || h.toLowerCase() === "image");
      const imageAltIndex = headers.findIndex((h) => h.toLowerCase() === "image alt");
      const metaTitleIndex = headers.findIndex((h) => h.toLowerCase() === "meta title");
      const metaDescriptionIndex = headers.findIndex((h) => h.toLowerCase() === "meta description");
      const metaKeywordsIndex = headers.findIndex((h) => h.toLowerCase() === "meta keywords");
      const statusIndex = headers.findIndex((h) => h.toLowerCase() === "status");
      const categoriesIndex = headers.findIndex((h) => h.toLowerCase() === "categories");

      if (titleIndex === -1 || contentIndex === -1) {
        return NextResponse.json(
          { success: false, message: "CSV must have 'Title' and 'Content' columns" },
          { status: 400 }
        );
      }

      // Parse CSV rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        if (values.length >= Math.max(titleIndex, contentIndex) + 1) {
          const parseValue = (index: number) => {
            if (index === -1) return null;
            const val = values[index]?.replace(/^"|"$/g, "") || "";
            return val.trim() || null;
          };

          blogs.push({
            title: parseValue(titleIndex) || "",
            slug: parseValue(slugIndex) || undefined,
            content: parseValue(contentIndex) || "",
            image: parseValue(imageIndex) || null,
            imageAlt: parseValue(imageAltIndex) || null,
            metaTitle: parseValue(metaTitleIndex) || null,
            metaDescription: parseValue(metaDescriptionIndex) || null,
            metaKeywords: parseValue(metaKeywordsIndex) || null,
            status: parseValue(statusIndex)?.toLowerCase() === "approved" || parseValue(statusIndex) === "1" || parseValue(statusIndex) === "true",
            categories: parseValue(categoriesIndex) || undefined,
          });
        }
      }
    } else {
      // Parse JSON
      try {
        const jsonData = JSON.parse(fileContent);
        blogs = Array.isArray(jsonData.data) ? jsonData.data : Array.isArray(jsonData) ? jsonData : [];
      } catch (parseError) {
        return NextResponse.json(
          { success: false, message: "Invalid JSON format", error: (parseError as Error).message },
          { status: 400 }
        );
      }
    }

    if (blogs.length === 0) {
      return NextResponse.json(
        { success: false, message: "No blogs found in file" },
        { status: 400 }
      );
    }

    // Validate and import blogs
    const results = {
      total: blogs.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    const authorId = Number(sessionUserId);

    for (let i = 0; i < blogs.length; i++) {
      const blogData = blogs[i];
      try {
        // Validate required fields
        if (!blogData.title || !blogData.content) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Title and content are required`);
          continue;
        }

        // Generate slug if not provided
        let slug = blogData.slug || slugify(blogData.title);
        if (!slug) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Could not generate slug from title`);
          continue;
        }

        // Check for duplicate slug
        const existing = await queryOne<{ id: number }>(
          `SELECT id FROM Blog WHERE slug = ?`,
          [slug]
        );

        if (existing) {
          if (skipDuplicates) {
            results.skipped++;
            continue;
          }
          // Make slug unique
          slug = await ensureUniqueSlug(slug);
        }

        // Import blog in transaction
        await transaction(async (conn) => {
          // Insert blog
          const blogId = await connInsert(
            conn,
            `INSERT INTO Blog (
              title, slug, content, metaTitle, metaDescription, metaKeywords,
              image, imageAlt, authorId, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              blogData.title,
              slug,
              blogData.content,
              blogData.metaTitle || null,
              blogData.metaDescription || null,
              blogData.metaKeywords || null,
              blogData.image || null,
              blogData.imageAlt || null,
              authorId,
              blogData.status !== undefined ? (blogData.status ? 1 : 0) : 0, // Default to pending
            ]
          );

          // Handle categories
          if (blogData.categories) {
            const categoryNames = blogData.categories
              .split(",")
              .map((name) => name.trim())
              .filter((name) => name.length > 0);

            for (const categoryName of categoryNames) {
              try {
                const categoryId = await getOrCreateCategory(conn, categoryName);
                await connExecute(
                  conn,
                  `INSERT IGNORE INTO BlogCategory (blogId, categoryId) VALUES (?, ?)`,
                  [blogId, categoryId]
                );
              } catch (catError: any) {
                console.error(`Error processing category "${categoryName}":`, catError);
                // Continue with other categories
              }
            }
          }
        });

        results.created++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message || "Unknown error"}`);
        console.error(`Error importing blog at row ${i + 1}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.skipped} skipped, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error("Error importing blogs:", error);
    return NextResponse.json(
      { success: false, message: "Failed to import blogs", error: error.message },
      { status: 500 }
    );
  }
}

