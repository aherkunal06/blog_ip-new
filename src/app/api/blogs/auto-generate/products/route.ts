import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/products - Get products with generation status (paginated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';

    // Build WHERE clause for filtering
    let whereClause = 'WHERE pi.syncStatus = "active"';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (pi.name LIKE ? OR pi.category LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Build base query with subquery for status calculation
    const baseSql = `
      SELECT 
        pi.id,
        pi.name,
        pi.category,
        COALESCE(COUNT(DISTINCT pat.id), 0) as titlesGenerated,
        COALESCE(COUNT(DISTINCT pb.blogId), 0) as articlesGenerated,
        CASE
          WHEN COALESCE(COUNT(DISTINCT pat.id), 0) = 10 AND COALESCE(COUNT(DISTINCT pb.blogId), 0) = 10 THEN 'complete'
          WHEN COALESCE(COUNT(DISTINCT pat.id), 0) = 10 AND COALESCE(COUNT(DISTINCT pb.blogId), 0) > 0 AND COALESCE(COUNT(DISTINCT pb.blogId), 0) < 10 THEN 'partial'
          WHEN COALESCE(COUNT(DISTINCT pat.id), 0) = 10 AND COALESCE(COUNT(DISTINCT pb.blogId), 0) = 0 THEN 'titles_only'
          WHEN COALESCE(COUNT(DISTINCT pat.id), 0) > 0 AND COALESCE(COUNT(DISTINCT pat.id), 0) < 10 THEN 'in_progress'
          ELSE 'not_started'
        END as overallStatus
      FROM ProductIndex pi
      LEFT JOIN ProductArticleTitle pat ON pi.id = pat.productIndexId
      LEFT JOIN ProductBlog pb ON pi.id = pb.productIndexId AND pat.id = pb.articleTitleId
      ${whereClause}
      GROUP BY pi.id, pi.name, pi.category
    `;

    // Apply status filter using HAVING
    let havingClause = '';
    if (statusFilter !== 'all') {
      havingClause = `HAVING overallStatus = ?`;
      params.push(statusFilter);
    }

    // Get products with pagination
    const sql = `
      SELECT * FROM (
        ${baseSql}
        ${havingClause}
      ) as product_status
      ORDER BY 
        CASE overallStatus
          WHEN 'complete' THEN 1
          WHEN 'partial' THEN 2
          WHEN 'titles_only' THEN 3
          WHEN 'in_progress' THEN 4
          ELSE 5
        END,
        product_status.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const products = await query(sql, params);

    // Get total count with same filters
    const countSql = `
      SELECT COUNT(*) as total FROM (
        ${baseSql}
        ${havingClause}
      ) as product_status
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = countResult?.total || 0;

    // For each product, get detailed title information
    const productsWithTitles = await Promise.all(
      products.map(async (product: any) => {
        const titles = await query<{
          id: number;
          title: string;
          slug: string;
          articleNumber: number;
          status: string;
        }>(
          `SELECT id, title, slug, articleNumber, status 
           FROM ProductArticleTitle 
           WHERE productIndexId = ? 
           ORDER BY articleNumber`,
          [product.id]
        );

        // Get blog info for each title
        const titlesWithBlogs = await Promise.all(
          titles.map(async (title) => {
            const blog = await queryOne<{
              blogId: number;
            }>(
              `SELECT pb.blogId
               FROM ProductBlog pb
               WHERE pb.productIndexId = ? AND pb.articleTitleId = ?
               LIMIT 1`,
              [product.id, title.id]
            );

            const hyperlinkCount = await queryOne<{ count: number }>(
              `SELECT COUNT(*) as count FROM ArticleHyperlink WHERE blogId = ?`,
              [blog?.blogId || 0]
            );

            return {
              ...title,
              blogId: blog?.blogId,
              hyperlinkCount: hyperlinkCount?.count || 0,
            };
          })
        );

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          titlesGenerated: parseInt(product.titlesGenerated),
          articlesGenerated: parseInt(product.articlesGenerated),
          overallStatus: product.overallStatus,
          titles: titlesWithBlogs,
        };
      })
    );

    const filteredProducts = productsWithTitles;

    return NextResponse.json({
      products: filteredProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching products with status:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

