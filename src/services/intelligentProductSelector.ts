// Intelligent Product Selection Service
// Automatically matches products to blog content based on relevance, like Google Ads

import { query } from "@/lib/db";
import { decodeHtmlEntities } from "@/lib/utils";

export interface ProductMatch {
  product: any;
  relevanceScore: number;
  finalScore: number;
  matchReasons: string[];
}

export interface BlogContext {
  title: string;
  content: string;
  categories: string[];
  keywords?: string[];
}

export class IntelligentProductSelector {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'now'
  ]);

  /**
   * Extract keywords from blog content
   */
  private extractKeywords(content: string, title: string): string[] {
    const text = this.stripHtml(content + ' ' + title).toLowerCase();
    const words = text
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 3 && !this.stopWords.has(w));

    // Count frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Get top keywords (sorted by frequency)
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculate relevance score between blog and product
   */
  private calculateRelevanceScore(
    blogContext: BlogContext,
    product: any
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const blogKeywords = blogContext.keywords || this.extractKeywords(blogContext.content, blogContext.title);
    const productName = decodeHtmlEntities(product.name || '').toLowerCase();
    const productCategory = decodeHtmlEntities(product.category || '').toLowerCase();
    const productDescription = this.stripHtml(product.description || '').toLowerCase();
    const productTags = (product.tags ? JSON.parse(product.tags) : []).map((t: string) => t.toLowerCase());

    // 1. Category Match (40 points)
    if (productCategory) {
      const categoryMatch = blogContext.categories.some(cat => 
        cat.toLowerCase().includes(productCategory) || 
        productCategory.includes(cat.toLowerCase())
      );
      if (categoryMatch) {
        score += 40;
        reasons.push(`Category match: ${product.category}`);
      }
    }

    // 2. Product Name Keywords (30 points)
    const nameWords = productName.split(/\s+/).filter(w => w.length > 3);
    let nameMatches = 0;
    for (const keyword of blogKeywords) {
      if (nameWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        nameMatches++;
      }
    }
    if (nameMatches > 0) {
      const nameScore = Math.min(30, nameMatches * 10);
      score += nameScore;
      reasons.push(`${nameMatches} keyword(s) matched in product name`);
    }

    // 3. Description Keywords (20 points)
    const descWords = productDescription.split(/\s+/).filter(w => w.length > 3);
    let descMatches = 0;
    for (const keyword of blogKeywords) {
      if (descWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        descMatches++;
      }
    }
    if (descMatches > 0) {
      const descScore = Math.min(20, descMatches * 5);
      score += descScore;
      reasons.push(`${descMatches} keyword(s) matched in description`);
    }

    // 4. Tag Match (10 points)
    if (productTags.length > 0) {
      const tagMatches = blogKeywords.filter(kw => 
        productTags.some((tag: string) => tag.includes(kw) || kw.includes(tag))
      ).length;
      if (tagMatches > 0) {
        score += Math.min(10, tagMatches * 3);
        reasons.push(`${tagMatches} tag(s) matched`);
      }
    }

    return { score: Math.min(100, score), reasons };
  }

  /**
   * Calculate final product score with all factors
   */
  private calculateFinalScore(
    product: any,
    relevanceScore: number
  ): number {
    // Weighted scoring:
    // - Relevance: 50%
    // - Admin Priority: 25%
    // - Popularity: 15%
    // - Recency: 10%

    const adminPriority = Math.min(100, product.adminPriority || 50);
    const popularity = Math.min(100, product.popularityScore || 0);
    
    // Recency based on lastSyncedAt (newer = higher score)
    let recency = 50;
    if (product.lastSyncedAt) {
      const daysSinceSync = (Date.now() - new Date(product.lastSyncedAt).getTime()) / (1000 * 60 * 60 * 24);
      recency = Math.max(0, 100 - daysSinceSync * 2); // Decrease 2 points per day
    }

    const finalScore = 
      (relevanceScore * 0.50) +
      (adminPriority * 0.25) +
      (popularity * 0.15) +
      (recency * 0.10);

    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Select relevant products for a blog
   */
  async selectProductsForBlog(
    blogContext: BlogContext,
    options: {
      maxProducts?: number;
      minRelevanceScore?: number;
      placement?: string;
    } = {}
  ): Promise<ProductMatch[]> {
    const {
      maxProducts = 10,
      minRelevanceScore = 20,
      placement = 'sidebar'
    } = options;

    // Extract keywords if not provided
    const keywords = blogContext.keywords || 
      this.extractKeywords(blogContext.content, blogContext.title);

    // Get candidate products
    // Search in name, description, category, tags
    let sql = `
      SELECT pi.*
      FROM ProductIndex pi
      WHERE pi.syncStatus = 'active'
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Category match
    if (blogContext.categories.length > 0) {
      const categoryPlaceholders = blogContext.categories.map(() => '?').join(',');
      conditions.push(`pi.category IN (${categoryPlaceholders})`);
      params.push(...blogContext.categories);
    }

    // Keyword match (use first 3 keywords for initial filtering)
    if (keywords.length > 0) {
      const searchKeyword = keywords[0];
      conditions.push(`(
        pi.name LIKE CONCAT('%', ?, '%')
        OR pi.description LIKE CONCAT('%', ?, '%')
        OR pi.category LIKE CONCAT('%', ?, '%')
      )`);
      params.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (conditions.length > 0) {
      sql += ` AND (${conditions.join(' OR ')})`;
    }

    sql += ` ORDER BY pi.adminPriority DESC, pi.popularityScore DESC LIMIT 100`;

    const candidates = await query(sql, params);

    if (candidates.length === 0) {
      // Fallback: Get top products by popularity
      const fallback = await query(
        `SELECT * FROM ProductIndex 
         WHERE syncStatus = 'active'
         ORDER BY adminPriority DESC, popularityScore DESC
         LIMIT ?`,
        [maxProducts]
      );
      return (fallback as any[]).map(p => ({
        product: p,
        relevanceScore: 30, // Default relevance
        finalScore: this.calculateFinalScore(p, 30),
        matchReasons: ['Popular product']
      }));
    }

    // Calculate scores for each candidate
    const scoredProducts: ProductMatch[] = (candidates as any[]).map(product => {
      const { score: relevanceScore, reasons } = this.calculateRelevanceScore(blogContext, product);
      const finalScore = this.calculateFinalScore(product, relevanceScore);

      return {
        product,
        relevanceScore,
        finalScore,
        matchReasons: reasons
      };
    });

    // Filter by minimum relevance
    const filtered = scoredProducts.filter(m => m.relevanceScore >= minRelevanceScore);

    // Sort by final score
    filtered.sort((a, b) => b.finalScore - a.finalScore);

    // Return top products
    return filtered.slice(0, maxProducts);
  }

  /**
   * Get products for a blog slug (fetches blog data first)
   */
  async selectProductsForBlogSlug(
    blogSlug: string,
    options: {
      maxProducts?: number;
      minRelevanceScore?: number;
      placement?: string;
    } = {}
  ): Promise<ProductMatch[]> {
    // Fetch blog data
    const blog = await query(
      `SELECT b.id, b.title, b.content, 
              GROUP_CONCAT(DISTINCT c.name) as categories
       FROM Blog b
       LEFT JOIN BlogCategory bc ON b.id = bc.blogId
       LEFT JOIN Category c ON bc.categoryId = c.id
       WHERE b.slug = ? AND b.status = TRUE
       GROUP BY b.id, b.title, b.content`,
      [blogSlug]
    );

    if (!blog || (blog as any[]).length === 0) {
      return [];
    }

    const blogData = (blog as any[])[0];
    const categories = blogData.categories 
      ? blogData.categories.split(',').filter((c: string) => c.trim())
      : [];

    const blogContext: BlogContext = {
      title: blogData.title,
      content: blogData.content,
      categories
    };

    return this.selectProductsForBlog(blogContext, options);
  }

  /**
   * Get products for a category
   */
  async selectProductsForCategory(
    categoryName: string,
    options: {
      maxProducts?: number;
      minRelevanceScore?: number;
      placement?: string;
    } = {}
  ): Promise<ProductMatch[]> {
    const maxProducts = options.maxProducts || 10;
    const minRelevanceScore = options.minRelevanceScore || 20;

    // Get products from this category
    const products = await query(
      `SELECT * FROM ProductIndex 
       WHERE category = ? AND syncStatus = 'active'
       ORDER BY adminPriority DESC, popularityScore DESC
       LIMIT ?`,
      [categoryName, maxProducts * 2]
    );

    if (!products || (products as any[]).length === 0) {
      return [];
    }

    // Convert to ProductMatch format
    const matches: ProductMatch[] = (products as any[]).slice(0, maxProducts).map(product => ({
      product,
      relevanceScore: 50, // Category match gets good relevance
      finalScore: this.calculateFinalScore(product, 50),
      matchReasons: [`Category match: ${categoryName}`]
    }));

    return matches;
  }
}

