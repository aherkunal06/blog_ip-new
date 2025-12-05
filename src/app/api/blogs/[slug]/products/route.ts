// app/api/blogs/[slug]/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, insert, execute } from "@/lib/db";
import { checkApiRoutePermission } from "@/lib/checkApiRoutePermission";
import { IntelligentProductSelector } from "@/services/intelligentProductSelector";

export const dynamic = "force-dynamic";

interface BlogProductsParams {
  params: Promise<{ slug: string }>;
}

// GET /api/blogs/[slug]/products - Get products linked to a blog
export async function GET(request: Request, { params }: BlogProductsParams) {
  try {
    const { slug } = await params;

    // Get blog ID from slug
    const blog = await query(
      `SELECT id FROM Blog WHERE slug = ? AND status = TRUE`,
      [slug]
    );

    if (!blog || (blog as any[]).length === 0) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const blogId = (blog as any[])[0].id;

    // Get products from ArticleHyperlink (for auto-generated blogs)
    const hyperlinkedProducts = await query(
      `SELECT 
         pi.id,
         pi.name,
         pi.category,
         pi.price,
         pi.salePrice,
         pi.image,
         pi.ipshopyUrl,
         ah.linkedText,
         ah.position
       FROM ArticleHyperlink ah
       INNER JOIN ProductIndex pi ON ah.linkedId = pi.id
       WHERE ah.blogId = ? AND ah.linkedType = 'product' AND pi.syncStatus = 'active'
       ORDER BY ah.position ASC`,
      [blogId]
    );

    // Get products from BlogProduct (for manually linked blogs)
    const manuallyLinkedProducts = await query(
      `SELECT 
         p.id,
         p.name,
         p.category,
         p.price,
         p.salePrice,
         p.image,
         p.ipshopyUrl,
         bp.linkType,
         bp.position
       FROM Product p
       INNER JOIN BlogProduct bp ON p.id = bp.productId
       WHERE bp.blogId = ? AND p.status = 'active'
       ORDER BY bp.position ASC, bp.createdAt ASC`,
      [blogId]
    );

    // Combine and deduplicate products (prefer hyperlinked products)
    const productMap = new Map();
    
    // Add hyperlinked products first
    (hyperlinkedProducts as any[]).forEach((p: any) => {
      productMap.set(p.id, {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        salePrice: p.salePrice,
        image: p.image,
        ipshopyUrl: p.ipshopyUrl,
        position: p.position || 0,
      });
    });

    // Add manually linked products (only if not already added)
    (manuallyLinkedProducts as any[]).forEach((p: any) => {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          salePrice: p.salePrice,
          image: p.image,
          ipshopyUrl: p.ipshopyUrl,
          position: p.position || 999, // Lower priority
        });
      }
    });

    // Convert to array and sort by position
    let products = Array.from(productMap.values()).sort((a, b) => a.position - b.position);

    // If no products found, use intelligent selection
    if (products.length === 0) {
      const selector = new IntelligentProductSelector();
      const matches = await selector.selectProductsForBlogSlug(slug, {
        maxProducts: 10,
        minRelevanceScore: 20
      });

      products = matches.map(match => ({
        id: match.product.id,
        name: match.product.name,
        category: match.product.category,
        price: match.product.price,
        salePrice: match.product.salePrice,
        image: match.product.image,
        ipshopyUrl: match.product.ipshopyUrl,
        position: 0,
        relevanceScore: match.relevanceScore,
        matchReasons: match.matchReasons
      }));
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching blog products:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog products", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/blogs/[slug]/products - Link products to a blog
export async function POST(req: NextRequest, { params }: BlogProductsParams) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { productIds, linkType = "mentioned" } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      );
    }

    // Get blog ID from slug
    const blog = await query(
      `SELECT id FROM Blog WHERE slug = ?`,
      [slug]
    );

    if (!blog || (blog as any[]).length === 0) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const blogId = (blog as any[])[0].id;

    // Link products
    const links = [];
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      try {
        await insert(
          `INSERT INTO BlogProduct (blogId, productId, linkType, position)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE linkType = VALUES(linkType), position = VALUES(position)`,
          [blogId, productId, linkType, i]
        );
        links.push({ blogId, productId, linkType, position: i });
      } catch (error: any) {
        // Skip duplicate entries
        if (error.code !== "ER_DUP_ENTRY") {
          throw error;
        }
      }
    }

    return NextResponse.json({ links, message: "Products linked successfully" });
  } catch (error: any) {
    console.error("Error linking products:", error);
    return NextResponse.json(
      { error: "Failed to link products", message: error.message },
      { status: 500 }
    );
  }
}

