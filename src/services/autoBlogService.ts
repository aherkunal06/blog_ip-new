import { articleTitleGenerator } from './articleTitleGenerator';
import { blogGenerator } from './blogGenerator';
import { AIProviderFactory, AIProviderConfig } from './ai/aiProviderFactory';
import { query, queryOne, insert, execute, transaction } from '@/lib/db';

export interface GenerationResult {
  productIndexId: number;
  productName: string;
  titlesGenerated: number;
  articlesGenerated: number;
  totalHyperlinks: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  results: Array<{
    articleNumber: number;
    title: string;
    blogId?: number;
    status: string;
    hyperlinkCount: number;
    error?: string;
  }>;
}

export class AutoBlogService {
  /**
   * Generate all articles for a product (10 titles + 10 articles)
   */
  async generateAllForProduct(
    productIndexId: number,
    options: {
      regenerateTitles?: boolean;
      regenerateArticles?: boolean;
      skipExisting?: boolean;
      providerConfig?: AIProviderConfig;
    } = {}
  ): Promise<GenerationResult> {
    const { regenerateTitles, regenerateArticles, skipExisting, providerConfig } = options;

    try {
      // Get product info
      const product = await queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM ProductIndex WHERE id = ?`,
        [productIndexId]
      );

      if (!product) {
        throw new Error(`Product with ID ${productIndexId} not found`);
      }

      const results: GenerationResult['results'] = [];
      const errors: string[] = [];

      // Step 1: Generate or get titles
      let titles;
      if (regenerateTitles) {
        titles = await articleTitleGenerator.generateTitles(productIndexId, providerConfig);
      } else {
        titles = await articleTitleGenerator.getTitles(productIndexId);
        if (titles.length < 10) {
          // Generate missing titles
          titles = await articleTitleGenerator.generateTitles(productIndexId, providerConfig);
        }
      }

      // Step 2: Generate articles for each title
      let articlesGenerated = 0;
      let totalHyperlinks = 0;

      for (const title of titles) {
        try {
          // Check if article already exists
          if (skipExisting) {
            const existing = await queryOne<{ blogId: number }>(
              `SELECT blogId FROM ProductBlog 
               WHERE productIndexId = ? AND articleTitleId = ? 
               AND generationStatus = 'completed'`,
              [productIndexId, title.id]
            );

            if (existing) {
              const hyperlinkCount = await queryOne<{ count: number }>(
                `SELECT COUNT(*) as count FROM ArticleHyperlink WHERE blogId = ?`,
                [existing.blogId]
              );

              results.push({
                articleNumber: title.articleNumber,
                title: title.title,
                blogId: existing.blogId,
                status: 'completed',
                hyperlinkCount: hyperlinkCount?.count || 0,
              });
              totalHyperlinks += hyperlinkCount?.count || 0;
              continue;
            }
          }

          // Generate article
          if (regenerateArticles || !skipExisting) {
            const blog = await blogGenerator.generateArticle(
              productIndexId,
              title.id,
              providerConfig
            );

            articlesGenerated++;
            totalHyperlinks += blog.hyperlinkCount;

            results.push({
              articleNumber: title.articleNumber,
              title: title.title,
              blogId: blog.blogId,
              status: 'completed',
              hyperlinkCount: blog.hyperlinkCount,
            });
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          errors.push(`Article ${title.articleNumber}: ${errorMsg}`);
          results.push({
            articleNumber: title.articleNumber,
            title: title.title,
            status: 'failed',
            hyperlinkCount: 0,
            error: errorMsg,
          });
        }
      }

      const status: GenerationResult['status'] =
        errors.length === 0
          ? 'success'
          : articlesGenerated > 0
          ? 'partial'
          : 'failed';

      return {
        productIndexId,
        productName: product.name,
        titlesGenerated: titles.length,
        articlesGenerated,
        totalHyperlinks,
        status,
        errors,
        results,
      };
    } catch (error: any) {
      console.error('Error generating articles for product:', error);
      throw error;
    }
  }

  /**
   * Batch generate for multiple products
   */
  async batchGenerate(
    productIds: number[],
    options: {
      generateTitles?: boolean;
      generateArticles?: boolean;
      skipExisting?: boolean;
      limit?: number;
      providerConfig?: AIProviderConfig;
    } = {}
  ): Promise<{
    total: number;
    processed: number;
    titlesCreated: number;
    articlesCreated: number;
    totalHyperlinks: number;
    failed: number;
    results: Array<{
      productId: number;
      productName: string;
      titlesGenerated: number;
      articlesGenerated: number;
      status: string;
      errors?: string[];
    }>;
  }> {
    const {
      generateTitles = true,
      generateArticles = true,
      skipExisting = true,
      limit,
      providerConfig,
    } = options;

    // Get products to process
    let productsToProcess = productIds;

    if (productIds.length === 0) {
      // Get all active products
      const allProducts = await query<{ id: number; name: string }>(
        `SELECT id, name FROM ProductIndex 
         WHERE syncStatus = 'active' 
         ORDER BY popularityScore DESC, adminPriority DESC`
      );
      productsToProcess = allProducts.map((p) => p.id);
    }

    if (limit) {
      productsToProcess = productsToProcess.slice(0, limit);
    }

    const results: Array<{
      productId: number;
      productName: string;
      titlesGenerated: number;
      articlesGenerated: number;
      status: string;
      errors?: string[];
    }> = [];

    let titlesCreated = 0;
    let articlesCreated = 0;
    let totalHyperlinks = 0;
    let failed = 0;

    for (const productId of productsToProcess) {
      try {
        const result = await this.generateAllForProduct(productId, {
          regenerateTitles: generateTitles,
          regenerateArticles: generateArticles,
          skipExisting,
          providerConfig,
        });

        titlesCreated += result.titlesGenerated;
        articlesCreated += result.articlesGenerated;
        totalHyperlinks += result.totalHyperlinks;

        if (result.status === 'failed') {
          failed++;
        }

        results.push({
          productId: result.productIndexId,
          productName: result.productName,
          titlesGenerated: result.titlesGenerated,
          articlesGenerated: result.articlesGenerated,
          status: result.status,
          errors: result.errors.length > 0 ? result.errors : undefined,
        });
      } catch (error: any) {
        failed++;
        const product = await queryOne<{ name: string }>(
          `SELECT name FROM ProductIndex WHERE id = ?`,
          [productId]
        );

        results.push({
          productId,
          productName: product?.name || `Product ${productId}`,
          titlesGenerated: 0,
          articlesGenerated: 0,
          status: 'failed',
          errors: [error.message || 'Unknown error'],
        });
      }
    }

    return {
      total: productsToProcess.length,
      processed: results.length,
      titlesCreated,
      articlesCreated,
      totalHyperlinks,
      failed,
      results,
    };
  }

  /**
   * Get generation status for a product
   */
  async getProductStatus(productIndexId: number): Promise<{
    productIndexId: number;
    productName: string;
    titlesGenerated: number;
    articlesGenerated: number;
    titles: Array<{
      id: number;
      title: string;
      slug: string;
      articleNumber: number;
      status: string;
      blogId?: number;
      hyperlinkCount?: number;
    }>;
    overallStatus: string;
  }> {
    const product = await queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM ProductIndex WHERE id = ?`,
      [productIndexId]
    );

    if (!product) {
      throw new Error(`Product with ID ${productIndexId} not found`);
    }

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
      [productIndexId]
    );

    // Get blog info for each title
    const titlesWithBlogs = await Promise.all(
      titles.map(async (title) => {
        const blog = await queryOne<{
          blogId: number;
          hyperlinkCount: number;
        }>(
          `SELECT pb.blogId, pb.hyperlinkCount
           FROM ProductBlog pb
           WHERE pb.productIndexId = ? AND pb.articleTitleId = ?
           LIMIT 1`,
          [productIndexId, title.id]
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

    const articlesGenerated = titlesWithBlogs.filter((t) => t.blogId).length;

    let overallStatus = 'not_started';
    if (titlesWithBlogs.length === 10 && articlesGenerated === 10) {
      overallStatus = 'complete';
    } else if (articlesGenerated > 0) {
      overallStatus = 'partial';
    } else if (titlesWithBlogs.length === 10) {
      overallStatus = 'titles_only';
    } else if (titlesWithBlogs.length > 0) {
      overallStatus = 'in_progress';
    }

    return {
      productIndexId,
      productName: product.name,
      titlesGenerated: titlesWithBlogs.length,
      articlesGenerated,
      titles: titlesWithBlogs,
      overallStatus,
    };
  }

  /**
   * Get generation statistics
   */
  async getStatistics(): Promise<{
    totalProducts: number;
    productsWithTitles: number;
    productsWithAllArticles: number;
    totalTitlesGenerated: number;
    totalArticlesGenerated: number;
    totalHyperlinks: number;
    averageHyperlinksPerArticle: number;
    pendingReview: number;
    averageScore: number;
    successRate: number;
  }> {
    const totalProducts = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ProductIndex WHERE syncStatus = 'active'`
    );

    const productsWithTitles = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT productIndexId) as count 
       FROM ProductArticleTitle 
       WHERE status = 'generated'`
    );

    const productsWithAllArticles = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT productIndexId) as count
       FROM ProductBlog
       WHERE generationStatus = 'completed'
       GROUP BY productIndexId
       HAVING COUNT(*) = 10`
    );

    const totalTitlesGenerated = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ProductArticleTitle WHERE status = 'generated'`
    );

    const totalArticlesGenerated = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ProductBlog WHERE generationStatus = 'completed'`
    );

    const totalHyperlinks = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ArticleHyperlink`
    );

    const avgHyperlinks = await queryOne<{ avg: number }>(
      `SELECT AVG(hyperlinkCount) as avg 
       FROM ProductBlog 
       WHERE generationStatus = 'completed' AND hyperlinkCount > 0`
    );

    const pendingReview = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM ProductBlog 
       WHERE generationStatus = 'review_required'`
    );

    const avgScore = await queryOne<{ avg: number }>(
      `SELECT AVG((contentScore + seoScore) / 2) as avg 
       FROM ProductBlog 
       WHERE generationStatus = 'completed'`
    );

    const successRate = await queryOne<{ rate: number }>(
      `SELECT 
         (COUNT(CASE WHEN generationStatus = 'completed' THEN 1 END) * 100.0 / COUNT(*)) as rate
       FROM ProductBlog`
    );

    return {
      totalProducts: totalProducts?.count || 0,
      productsWithTitles: productsWithTitles?.count || 0,
      productsWithAllArticles: productsWithAllArticles?.count || 0,
      totalTitlesGenerated: totalTitlesGenerated?.count || 0,
      totalArticlesGenerated: totalArticlesGenerated?.count || 0,
      totalHyperlinks: totalHyperlinks?.count || 0,
      averageHyperlinksPerArticle: Math.round(avgHyperlinks?.avg || 0),
      pendingReview: pendingReview?.count || 0,
      averageScore: Math.round(avgScore?.avg || 0),
      successRate: Math.round(successRate?.rate || 0),
    };
  }
}

export const autoBlogService = new AutoBlogService();

