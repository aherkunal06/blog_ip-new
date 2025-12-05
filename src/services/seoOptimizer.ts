import { slugify } from '@/lib/utils';
import { decodeHtmlEntities } from '@/lib/utils';

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  seoScore: number;
}

export interface SEOOptions {
  title: string;
  content: string;
  productName: string;
  category?: string;
}

export class SEOOptimizer {
  /**
   * Optimize SEO for blog content
   */
  async optimize(options: SEOOptions): Promise<SEOData> {
    const { title, content, productName, category } = options;

    // Generate meta title
    const metaTitle = this.generateMetaTitle(productName, category, title);

    // Generate meta description
    const metaDescription = this.generateMetaDescription(
      productName,
      category,
      content
    );

    // Generate slug
    const slug = this.generateSlug(productName, category, title);

    // Extract keywords
    const keywords = this.extractKeywords(productName, category, content);

    // Calculate SEO score
    const seoScore = this.calculateSEOScore({
      metaTitle,
      metaDescription,
      slug,
      keywords,
      content,
      productName,
    });

    return {
      metaTitle,
      metaDescription,
      slug,
      keywords,
      seoScore,
    };
  }

  /**
   * Generate meta title
   */
  private generateMetaTitle(
    productName: string,
    category: string | undefined,
    articleTitle: string
  ): string {
    const decodedProduct = decodeHtmlEntities(productName);
    const decodedCategory = category ? decodeHtmlEntities(category) : 'Products';
    const baseUrl = 'ipshopy.com';

    // Try to create: "Product Name - Key Feature | Category | ipshopy.com"
    // But keep it under 60 characters
    let metaTitle = `${decodedProduct} - ${articleTitle.substring(0, 20)} | ${decodedCategory} | ${baseUrl}`;

    // If too long, shorten
    if (metaTitle.length > 60) {
      const maxProductLength = 60 - decodedCategory.length - baseUrl.length - 15; // 15 for separators
      const shortProduct = decodedProduct.substring(0, maxProductLength);
      metaTitle = `${shortProduct} | ${decodedCategory} | ${baseUrl}`;
    }

    // Ensure it's exactly 50-60 characters
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + '...';
    } else if (metaTitle.length < 50) {
      // Pad with product name if too short
      const padding = 50 - metaTitle.length;
      metaTitle = `${decodedProduct.substring(0, padding)} - ${metaTitle}`;
    }

    return metaTitle.substring(0, 60);
  }

  /**
   * Generate meta description
   */
  private generateMetaDescription(
    productName: string,
    category: string | undefined,
    content: string
  ): string {
    const decodedProduct = decodeHtmlEntities(productName);
    const decodedCategory = category ? decodeHtmlEntities(category) : 'products';

    // Extract first sentence or first 120 characters from content
    const textContent = this.stripHtml(content);
    const firstSentence = textContent.split(/[.!?]/)[0];
    const excerpt = firstSentence.length > 100
      ? firstSentence.substring(0, 100)
      : textContent.substring(0, 100);

    // Build meta description
    let metaDesc = `Discover ${decodedProduct} - ${excerpt}. Shop now on ipshopy.com`;

    // Ensure 150-160 characters
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157) + '...';
    } else if (metaDesc.length < 150) {
      // Add more context
      const additional = textContent.substring(100, 150 - metaDesc.length + 100);
      metaDesc = `Discover ${decodedProduct} - ${excerpt} ${additional}. Shop now on ipshopy.com`;
      if (metaDesc.length > 160) {
        metaDesc = metaDesc.substring(0, 157) + '...';
      }
    }

    return metaDesc.substring(0, 160);
  }

  /**
   * Generate slug
   */
  private generateSlug(
    productName: string,
    category: string | undefined,
    articleTitle: string
  ): string {
    const decodedProduct = decodeHtmlEntities(productName);
    const decodedCategory = category ? decodeHtmlEntities(category) : 'products';
    const titleSlug = slugify(articleTitle.substring(0, 50));

    // Format: product-name-category-article-title
    const slug = `${slugify(decodedProduct)}-${slugify(decodedCategory)}-${titleSlug}`;

    // Limit to 100 characters
    return slug.substring(0, 100);
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(
    productName: string,
    category: string | undefined,
    content: string
  ): string[] {
    const keywords: string[] = [];
    const textContent = this.stripHtml(content).toLowerCase();

    // Primary keyword
    keywords.push(decodeHtmlEntities(productName));

    // Category keyword
    if (category) {
      keywords.push(decodeHtmlEntities(category));
    }

    // Extract common words (excluding stop words)
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'they',
      'them',
      'their',
      'what',
      'which',
      'who',
      'whom',
      'whose',
      'where',
      'when',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'now',
    ]);

    const words = textContent
      .split(/\s+/)
      .filter((word) => word.length > 4 && !stopWords.has(word));

    // Count word frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Get top 5 keywords (excluding product name and category)
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
      .filter(
        (word) =>
          !word.includes(productName.toLowerCase()) &&
          !(category && word.includes(category.toLowerCase()))
      )
      .slice(0, 5);

    keywords.push(...sortedWords);

    return keywords.slice(0, 10); // Max 10 keywords
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(data: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
    keywords: string[];
    content: string;
    productName: string;
  }): number {
    let score = 0;

    // Meta title score (30 points)
    if (data.metaTitle.length >= 50 && data.metaTitle.length <= 60) {
      score += 30;
    } else if (data.metaTitle.length >= 40 && data.metaTitle.length <= 70) {
      score += 20;
    } else {
      score += 10;
    }

    // Meta description score (20 points)
    if (data.metaDescription.length >= 150 && data.metaDescription.length <= 160) {
      score += 20;
    } else if (data.metaDescription.length >= 140 && data.metaDescription.length <= 170) {
      score += 15;
    } else {
      score += 10;
    }

    // Slug score (10 points)
    if (data.slug.length <= 100 && data.slug.includes(slugify(data.productName))) {
      score += 10;
    } else {
      score += 5;
    }

    // Keyword usage score (20 points)
    const contentLower = this.stripHtml(data.content).toLowerCase();
    const productNameLower = data.productName.toLowerCase();
    const keywordCount = (contentLower.match(new RegExp(productNameLower, 'g')) || []).length;
    const wordCount = contentLower.split(/\s+/).length;
    const density = (keywordCount / wordCount) * 100;

    if (density >= 1 && density <= 3) {
      score += 20;
    } else if (density >= 0.5 && density <= 4) {
      score += 15;
    } else {
      score += 10;
    }

    // Heading structure score (10 points)
    const headingMatches = data.content.match(/<h[2-3][^>]*>/gi);
    if (headingMatches && headingMatches.length >= 2) {
      score += 10;
    } else if (headingMatches && headingMatches.length >= 1) {
      score += 5;
    }

    // Internal links score (10 points)
    const linkMatches = data.content.match(/<a[^>]+href[^>]*>/gi);
    if (linkMatches && linkMatches.length >= 3 && linkMatches.length <= 8) {
      score += 10;
    } else if (linkMatches && linkMatches.length > 0) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export const seoOptimizer = new SEOOptimizer();

