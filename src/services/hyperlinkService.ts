import { query, queryOne } from '@/lib/db';
import { decodeHtmlEntities } from '@/lib/utils';

export interface LinkableItem {
  id: number;
  name: string;
  category?: string;
  url: string;
  type: 'product' | 'category';
}

export interface HyperlinkMention {
  text: string;
  type: 'product' | 'category';
  id: number;
  url: string;
  position: number;
  originalText: string;
}

export class HyperlinkService {
  private linkableItemsCache: {
    products: LinkableItem[];
    categories: LinkableItem[];
    timestamp: number;
  } | null = null;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all linkable products and categories
   */
  async getLinkableItems(forceRefresh: boolean = false): Promise<{
    products: LinkableItem[];
    categories: LinkableItem[];
  }> {
    const now = Date.now();

    // Return cached if valid
    if (
      !forceRefresh &&
      this.linkableItemsCache &&
      now - this.linkableItemsCache.timestamp < this.cacheTimeout
    ) {
      return {
        products: this.linkableItemsCache.products,
        categories: this.linkableItemsCache.categories,
      };
    }

    // Fetch products
    const products = await query<{
      id: number;
      name: string;
      category: string | null;
      ipshopyUrl: string;
    }>(
      `SELECT id, name, category, ipshopyUrl 
       FROM ProductIndex 
       WHERE syncStatus = 'active' 
       ORDER BY popularityScore DESC, adminPriority DESC`
    );

    // Fetch categories
    const categories = await query<{
      id: number;
      name: string;
      slug: string;
    }>(
      `SELECT id, name, slug 
       FROM Category 
       WHERE status = TRUE`
    );

    const linkableProducts: LinkableItem[] = products.map((p) => {
      // Ensure URL is full URL (ipshopy.com/keyword format)
      let url = p.ipshopyUrl;
      if (url && !url.startsWith('http')) {
        // If URL doesn't start with http, assume it's a keyword and prepend https://ipshopy.com/
        url = url.startsWith('/') ? `https://ipshopy.com${url}` : `https://ipshopy.com/${url}`;
      }
      return {
        id: p.id,
        name: decodeHtmlEntities(p.name),
        category: p.category ? decodeHtmlEntities(p.category) : undefined,
        url: url,
        type: 'product' as const,
      };
    });

    const linkableCategories: LinkableItem[] = categories.map((c) => ({
      id: c.id,
      name: decodeHtmlEntities(c.name),
      url: `/articles/${c.slug}`,
      type: 'category' as const,
    }));

    // Update cache
    this.linkableItemsCache = {
      products: linkableProducts,
      categories: linkableCategories,
      timestamp: now,
    };

    return {
      products: linkableProducts,
      categories: linkableCategories,
    };
  }

  /**
   * Detect product/category mentions in content
   */
  detectMentions(
    content: string,
    linkableItems: { products: LinkableItem[]; categories: LinkableItem[] }
  ): HyperlinkMention[] {
    const mentions: HyperlinkMention[] = [];
    const processedPositions = new Set<number>();
    const maxLinks = 8; // Maximum links per article
    const minLinkDistance = 50; // Minimum characters between same product links

    // Combine all items and sort by priority (products first, then by name length for better matching)
    const allItems = [
      ...linkableItems.products.map((p) => ({ ...p, priority: 1 })),
      ...linkableItems.categories.map((c) => ({ ...c, priority: 2 })),
    ].sort((a, b) => {
      // Sort by priority first, then by name length (longer names first for better matching)
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.name.length - a.name.length;
    });

    // Track which items have been linked
    const linkedItems = new Map<number, number>(); // itemId -> last position

    for (const item of allItems) {
      if (mentions.length >= maxLinks) break;

      // Create search patterns
      const patterns = this.createSearchPatterns(item.name);

      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${this.escapeRegex(pattern)}\\b`, 'gi');
        let match;

        while ((match = regex.exec(content)) !== null && mentions.length < maxLinks) {
          const position = match.index;
          const matchedText = match[0];

          // Skip if too close to a previous link of the same item
          const lastPosition = linkedItems.get(item.id);
          if (lastPosition !== undefined && position - lastPosition < minLinkDistance) {
            continue;
          }

          // Skip if position already processed
          if (processedPositions.has(position)) {
            continue;
          }

          // Check context - don't link if it's in a URL or already a link
          const before = content.substring(Math.max(0, position - 10), position);
          const after = content.substring(position, Math.min(content.length, position + matchedText.length + 10));

          if (before.includes('href=') || before.includes('http') || after.includes('</a>')) {
            continue;
          }

          mentions.push({
            text: matchedText,
            type: item.type,
            id: item.id,
            url: item.url,
            position,
            originalText: matchedText,
          });

          processedPositions.add(position);
          linkedItems.set(item.id, position);
          break; // Only link first occurrence per item
        }
      }
    }

    // Sort by position
    return mentions.sort((a, b) => a.position - b.position);
  }

  /**
   * Create search patterns for an item name
   */
  private createSearchPatterns(name: string): string[] {
    const patterns: string[] = [name];

    // Add variations
    const lower = name.toLowerCase();
    patterns.push(lower);

    // Handle compound names (e.g., "sun cream" -> "suncream", "sun-cream")
    if (name.includes(' ')) {
      patterns.push(name.replace(/\s+/g, ''));
      patterns.push(name.replace(/\s+/g, '-'));
    }

    // Handle hyphenated names
    if (name.includes('-')) {
      patterns.push(name.replace(/-/g, ' '));
      patterns.push(name.replace(/-/g, ''));
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Insert hyperlinks into HTML content
   */
  insertHyperlinks(content: string, mentions: HyperlinkMention[]): string {
    if (mentions.length === 0) return content;

    // Sort mentions by position in reverse order to avoid position shifts
    const sortedMentions = [...mentions].sort((a, b) => b.position - a.position);

    let htmlContent = content;

    for (const mention of sortedMentions) {
      const before = htmlContent.substring(0, mention.position);
      const after = htmlContent.substring(mention.position + mention.originalText.length);

      // Ensure URL is full URL
      let url = mention.url;
      if (url && !url.startsWith('http')) {
        url = url.startsWith('/') ? `https://ipshopy.com${url}` : `https://ipshopy.com/${url}`;
      }

      const link = `<a href="${url}" target="_blank" rel="noopener noreferrer" data-${mention.type}-id="${mention.id}" class="product-link">${mention.text}</a>`;

      htmlContent = before + link + after;
    }

    return htmlContent;
  }

  /**
   * Save hyperlinks to database
   */
  async saveHyperlinks(blogId: number, mentions: HyperlinkMention[]): Promise<void> {
    if (mentions.length === 0) return;

    // Delete existing hyperlinks for this blog
    await query(`DELETE FROM ArticleHyperlink WHERE blogId = ?`, [blogId]);

    // Insert new hyperlinks
    for (const mention of mentions) {
      await query(
        `INSERT INTO ArticleHyperlink (blogId, linkedType, linkedId, linkedText, position)
         VALUES (?, ?, ?, ?, ?)`,
        [blogId, mention.type, mention.id, mention.text, mention.position]
      );
    }
  }

  /**
   * Validate hyperlink quality
   */
  validateHyperlinks(content: string, mentions: HyperlinkMention[]): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check link count
    if (mentions.length === 0) {
      issues.push('No hyperlinks found');
      score -= 30;
    } else if (mentions.length > 8) {
      issues.push(`Too many hyperlinks: ${mentions.length} (max 8)`);
      score -= 20;
    } else if (mentions.length < 3) {
      issues.push(`Too few hyperlinks: ${mentions.length} (recommended 3-7)`);
      score -= 10;
    }

    // Check link distribution
    const contentLength = content.length;
    const avgLinkDistance = contentLength / (mentions.length || 1);
    if (avgLinkDistance < 200) {
      issues.push('Hyperlinks are too close together');
      score -= 15;
    }

    // Check for duplicate links
    const linkCounts = new Map<number, number>();
    for (const mention of mentions) {
      const count = (linkCounts.get(mention.id) || 0) + 1;
      linkCounts.set(mention.id, count);
    }

    for (const [id, count] of linkCounts.entries()) {
      if (count > 1) {
        issues.push(`Product/Category ID ${id} linked ${count} times`);
        score -= 10;
      }
    }

    return {
      isValid: score >= 70,
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.linkableItemsCache = null;
  }
}

export const hyperlinkService = new HyperlinkService();

