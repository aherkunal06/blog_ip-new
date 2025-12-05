import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { autoBlogService } from "@/services/autoBlogService";
import { AIProviderFactory } from "@/services/ai/aiProviderFactory";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";

export const dynamic = "force-dynamic";

// POST /api/blogs/generate-for-products - Generate blogs for specific products by name
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productNames, providerId } = body;

    if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
      return NextResponse.json(
        { error: "productNames array is required" },
        { status: 400 }
      );
    }

    // Get provider config if specified
    let providerConfig;
    if (providerId) {
      providerConfig = await AIProviderFactory.getProviderById(providerId);
      if (!providerConfig) {
        return NextResponse.json(
          { error: "AI provider not found" },
          { status: 404 }
        );
      }
    } else {
      // Use default provider
      providerConfig = await AIProviderFactory.getDefaultProvider();
      if (!providerConfig) {
        return NextResponse.json(
          { error: "No active AI provider configured" },
          { status: 400 }
        );
      }
    }

    const results: Array<{
      productName: string;
      productIndexId: number | null;
      status: "found" | "not_found" | "error";
      generationResult?: any;
      error?: string;
    }> = [];

    // Find products and generate blogs
    for (const productName of productNames) {
      try {
        // Search for product by name (case-insensitive, partial match)
        const product = await queryOne<{
          id: number;
          name: string;
        }>(
          `SELECT id, name FROM ProductIndex 
           WHERE syncStatus = 'active' 
           AND (name LIKE ? OR name LIKE ?)
           LIMIT 1`,
          [`%${productName}%`, `%${productName.replace(/&amp;/g, "&")}%`]
        );

        if (!product) {
          results.push({
            productName,
            productIndexId: null,
            status: "not_found",
            error: "Product not found in ProductIndex",
          });
          continue;
        }

        // Generate blogs for this product
        const generationResult = await autoBlogService.generateAllForProduct(
          product.id,
          {
            regenerateTitles: false,
            regenerateArticles: false,
            skipExisting: true, // Skip if already generated
            providerConfig,
          }
        );

        results.push({
          productName,
          productIndexId: product.id,
          status: "found",
          generationResult: {
            titlesGenerated: generationResult.titlesGenerated,
            articlesGenerated: generationResult.articlesGenerated,
            totalHyperlinks: generationResult.totalHyperlinks,
            status: generationResult.status,
            errors: generationResult.errors.length > 0 ? generationResult.errors : undefined,
          },
        });
      } catch (error: any) {
        results.push({
          productName,
          productIndexId: null,
          status: "error",
          error: error.message || "Unknown error",
        });
      }
    }

    const summary = {
      total: productNames.length,
      found: results.filter((r) => r.status === "found").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      errors: results.filter((r) => r.status === "error").length,
      totalTitlesGenerated: results.reduce(
        (sum, r) => sum + (r.generationResult?.titlesGenerated || 0),
        0
      ),
      totalArticlesGenerated: results.reduce(
        (sum, r) => sum + (r.generationResult?.articlesGenerated || 0),
        0
      ),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error: any) {
    console.error("Error generating blogs for products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate blogs",
      },
      { status: 500 }
    );
  }
}

