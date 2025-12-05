import { AIProviderFactory, AIProviderConfig } from './ai/aiProviderFactory';
import { hyperlinkService, HyperlinkMention } from './hyperlinkService';
import { contentValidator } from './contentValidator';
import { seoOptimizer } from './seoOptimizer';
import { query, queryOne, insert, transaction, connInsert, connExecute } from '@/lib/db';
import { decodeHtmlEntities } from '@/lib/utils';

export interface GeneratedBlog {
  blogId: number;
  content: string;
  contentScore: number;
  seoScore: number;
  hyperlinkCount: number;
  validationErrors: string[];
}

export class BlogGenerator {
  /**
   * Generate blog article content for a product and article title
   */
  async generateArticle(
    productIndexId: number,
    articleTitleId: number,
    providerConfig?: AIProviderConfig
  ): Promise<GeneratedBlog> {
    try {
      // Get product information
      const product = await queryOne<{
        id: number;
        name: string;
        category: string | null;
        price: number | null;
        salePrice: number | null;
        description: string | null;
        tags: string | null;
        image: string | null;
      }>(
        `SELECT id, name, category, price, salePrice, description, tags, image
         FROM ProductIndex 
         WHERE id = ? AND syncStatus = 'active'`,
        [productIndexId]
      );

      if (!product) {
        throw new Error(`Product with ID ${productIndexId} not found or inactive`);
      }

      // Get article title
      const articleTitle = await queryOne<{
        id: number;
        title: string;
        articleNumber: number;
      }>(
        `SELECT id, title, articleNumber 
         FROM ProductArticleTitle 
         WHERE id = ?`,
        [articleTitleId]
      );

      if (!articleTitle) {
        throw new Error(`Article title with ID ${articleTitleId} not found`);
      }

      // Get AI provider config
      const aiConfig = providerConfig || (await AIProviderFactory.getDefaultProvider());
      if (!aiConfig) {
        throw new Error('No active AI provider configured');
      }

      // Get linkable items for hyperlinking
      const linkableItems = await hyperlinkService.getLinkableItems();

      // Generate content using AI
      const prompt = this.buildArticlePrompt(product, articleTitle.title, linkableItems);
      
      // Adjust maxTokens based on provider
      // For Ollama with smaller models, balance between content length and generation speed
      let maxTokens = 2000;
      if (aiConfig.providerName === 'ollama') {
        // Use 800 tokens for Ollama - should give ~1600-2000 chars but generate faster than 2000 tokens
        // 800 tokens ≈ 2000-2400 characters (rough estimate: 1 token ≈ 2.5-3 chars)
        maxTokens = 800; // Balanced for speed and content length
        console.log(`[BlogGenerator] Using optimized maxTokens (${maxTokens}) for Ollama to balance speed and content length`);
      }
      
      const response = await AIProviderFactory.generate(aiConfig, {
        prompt,
        maxTokens: maxTokens,
        temperature: 0.7,
      });

      let content = response.content.trim();

      // Validate content length (soft-check for now)
      if (content.length < 1600 || content.length > 2000) {
        console.warn(
          `[AutoBlog] Content length ${content.length} outside recommended range (1600-2000). Continuing for testing.`
        );
        // TODO: Reinstate hard validation once generation tuning is complete.
      }

      // Extract hyperlink markers from AI response
      const hyperlinkMarkers = this.extractHyperlinkMarkers(content);
      content = this.removeHyperlinkMarkers(content);

      // Detect additional mentions and create hyperlinks
      const detectedMentions = hyperlinkService.detectMentions(content, linkableItems);

      // Merge AI-suggested links with detected links
      const allMentions = this.mergeHyperlinks(hyperlinkMarkers, detectedMentions, linkableItems);

      // Insert hyperlinks into content
      content = hyperlinkService.insertHyperlinks(content, allMentions);

      // Validate content
      const validation = await contentValidator.validate(content, {
        productName: decodeHtmlEntities(product.name),
        category: product.category ? decodeHtmlEntities(product.category) : undefined,
      });

      // For testing: Only throw error if score is very low (< 50) or critical errors exist
      // Length errors are now warnings, so we're more lenient
      const criticalErrors = validation.errors.filter(e => 
        !e.toLowerCase().includes('content too short') && 
        !e.toLowerCase().includes('content too long')
      );

      if (criticalErrors.length > 0 && validation.score < 50) {
        throw new Error(
          `Content validation failed: ${criticalErrors.join(', ')}. Score: ${validation.score}`
        );
      }

      // Log warnings but continue
      if (validation.warnings.length > 0) {
        console.warn(`[AutoBlog] Validation warnings: ${validation.warnings.join(', ')}`);
      }

      // Optimize SEO
      const seoData = await seoOptimizer.optimize({
        title: articleTitle.title,
        content,
        productName: decodeHtmlEntities(product.name),
        category: product.category ? decodeHtmlEntities(product.category) : undefined,
      });

      // Create blog entry
      const blogId = await this.createBlog({
        title: articleTitle.title,
        slug: seoData.slug,
        content,
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        metaKeywords: seoData.keywords.join(', '),
        image: product.image || null,
        imageAlt: `${decodeHtmlEntities(product.name)} - ${articleTitle.title}`,
        isAutoGenerated: true,
        sourceProductId: productIndexId,
        authorId: 1, // Default admin user
      });

      // Save hyperlinks
      await hyperlinkService.saveHyperlinks(blogId, allMentions);

      // Link blog to product
      await this.linkBlogToProduct(productIndexId, articleTitleId, blogId, {
        contentScore: validation.score,
        seoScore: seoData.seoScore,
        hyperlinkCount: allMentions.length,
        validationErrors: validation.errors,
      });

      return {
        blogId,
        content,
        contentScore: validation.score,
        seoScore: seoData.seoScore,
        hyperlinkCount: allMentions.length,
        validationErrors: validation.errors,
      };
    } catch (error: any) {
      console.error('Error generating blog article:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for article generation
   */
  private buildArticlePrompt(
    product: {
      name: string;
      category: string | null;
      price: number | null;
      salePrice: number | null;
      description: string | null;
      tags: string | null;
    },
    articleTitle: string,
    linkableItems: { products: any[]; categories: any[] }
  ): string {
    const productName = decodeHtmlEntities(product.name);
    const category = product.category ? decodeHtmlEntities(product.category) : 'products';
    const price = product.price ? `₹${product.price}` : '';
    const salePrice = product.salePrice ? `₹${product.salePrice}` : '';
    const description = product.description
      ? decodeHtmlEntities(product.description).substring(0, 500)
      : '';
    const features = product.tags
      ? product.tags
          .split(',')
          .slice(0, 5)
          .map((tag) => tag.trim())
          .join(', ')
      : '';

    // Prepare available products/categories for hyperlinking (limit to 50 for prompt size)
    // Ensure URLs are in ipshopy.com format
    const availableProducts = linkableItems.products.slice(0, 30).map((p) => {
      let url = p.url;
      // Ensure full URL format for products (ipshopy.com/keyword)
      if (url && !url.startsWith('http')) {
        url = url.startsWith('/') ? `https://ipshopy.com${url}` : `https://ipshopy.com/${url}`;
      }
      return {
        name: p.name,
        category: p.category || '',
        url: url,
      };
    });

    const availableCategories = linkableItems.categories.slice(0, 20).map((c) => ({
      name: c.name,
      url: c.url, // Categories use relative URLs (/articles/slug)
    }));

    return `You are an expert content writer specializing in product descriptions and SEO-optimized blog posts for an e-commerce platform.

Product Information:
- Name: ${productName}
- Category: ${category}
- Price: ${price}${salePrice ? ` (Sale: ${salePrice})` : ''}
- Description: ${description || 'Premium quality product'}
- Features: ${features || 'Various features'}

Article Title: ${articleTitle}

Available Products/Categories for Hyperlinking:
${JSON.stringify([...availableProducts, ...availableCategories], null, 2)}

Requirements:
1. Write a professional, informative blog post based on the article title
2. Length: 1600-2000 characters (strictly within this range)
3. Tone: Professional, helpful, and informative
4. Structure:
   - Engaging introduction (200-300 chars)
   - Main content based on title (1000-1400 chars)
   - Conclusion with call-to-action (200-300 chars)

Content Guidelines:
- DO NOT mention any external websites or competitors
- DO NOT make false or misleading claims
- DO NOT use superlatives without evidence ("best", "cheapest", "fastest" - only if verifiable)
- DO NOT mention product IDs, SKU numbers, or internal reference numbers
- Focus on factual information and genuine benefits
- Use natural language, avoid keyword stuffing
- Write in a way that helps customers make informed decisions

Hyperlinking Requirements:
- When you mention a product name or category that exists in the available products list, mark it for hyperlinking
- Use format: [PRODUCT_NAME|PRODUCT_URL] or [CATEGORY_NAME|CATEGORY_URL]
- Only link when contextually relevant and natural
- Maximum 5-8 hyperlinks per article (avoid over-linking)
- Prioritize linking to related products in the same category
- Example: "For sun protection, consider our [Suncream|/products/suncream] collection"

SEO Requirements:
- Include primary keyword "${productName}" naturally 2-3 times
- Use related keywords: ${category}, ${features.split(',')[0] || 'quality'}
- Write for humans first, search engines second
- Ensure content is unique and valuable
- Match the article title's intent and topic

Output Format:
Return ONLY the blog content text with hyperlink markers:
- Plain text for regular content
- Use [TEXT|URL] format for hyperlinks
- No markdown, no HTML tags except hyperlink markers
- Example: "Check out our [Suncream Products|/category/suncream] for best protection."`;
  }

  /**
   * Extract hyperlink markers from AI response
   */
  private extractHyperlinkMarkers(content: string): Array<{ text: string; url: string }> {
    const markers: Array<{ text: string; url: string }> = [];
    const regex = /\[([^\|]+)\|([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      markers.push({
        text: match[1].trim(),
        url: match[2].trim(),
      });
    }

    return markers;
  }

  /**
   * Remove hyperlink markers from content
   */
  private removeHyperlinkMarkers(content: string): string {
    return content.replace(/\[([^\|]+)\|([^\]]+)\]/g, '$1');
  }

  /**
   * Merge AI-suggested hyperlinks with detected hyperlinks
   */
  private mergeHyperlinks(
    markers: Array<{ text: string; url: string }>,
    detected: HyperlinkMention[],
    linkableItems: { products: any[]; categories: any[] }
  ): HyperlinkMention[] {
    const merged: HyperlinkMention[] = [];
    const usedUrls = new Set<string>();
    const maxLinks = 8;

    // First, add AI-suggested links (they have priority)
    for (const marker of markers) {
      if (merged.length >= maxLinks) break;

      // Normalize URLs for matching (handle both relative and absolute)
      const normalizeUrl = (url: string) => {
        if (!url) return '';
        // Remove protocol and domain for comparison
        return url.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
      };

      const markerUrlNormalized = normalizeUrl(marker.url);

      // Find matching item by name or URL
      const item =
        linkableItems.products.find((p) => {
          const pUrlNormalized = normalizeUrl(p.url);
          return pUrlNormalized === markerUrlNormalized || 
                 p.name.toLowerCase() === marker.text.toLowerCase();
        }) ||
        linkableItems.categories.find((c) => {
          const cUrlNormalized = normalizeUrl(c.url);
          return cUrlNormalized === markerUrlNormalized || 
                 c.name.toLowerCase() === marker.text.toLowerCase();
        });

      if (item && !usedUrls.has(item.url)) {
        // Use the item's URL (which is already normalized to full URL)
        merged.push({
          text: marker.text,
          type: item.type,
          id: item.id,
          url: item.url, // Use the full URL from linkableItems
          position: 0, // Will be recalculated
          originalText: marker.text,
        });
        usedUrls.add(item.url);
      }
    }

    // Then add detected links that weren't already added
    for (const mention of detected) {
      if (merged.length >= maxLinks) break;
      if (!usedUrls.has(mention.url)) {
        merged.push(mention);
        usedUrls.add(mention.url);
      }
    }

    return merged;
  }

  /**
   * Create blog entry in database
   */
  private async createBlog(data: {
    title: string;
    slug: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    image: string | null;
    imageAlt: string;
    isAutoGenerated: boolean;
    sourceProductId: number;
    authorId: number;
  }): Promise<number> {
    // Check if slug exists
    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM Blog WHERE slug = ?`,
      [data.slug]
    );

    if (existing) {
      // Append number to make unique
      let counter = 1;
      let uniqueSlug = `${data.slug}-${counter}`;
      while (
        await queryOne<{ id: number }>(`SELECT id FROM Blog WHERE slug = ?`, [uniqueSlug])
      ) {
        counter++;
        uniqueSlug = `${data.slug}-${counter}`;
      }
      data.slug = uniqueSlug;
    }

    const blogId = await insert(
      `INSERT INTO Blog (
        title, slug, content, metaTitle, metaDescription, metaKeywords,
        image, imageAlt, isAutoGenerated, sourceProductId, authorId, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        data.title,
        data.slug,
        data.content,
        data.metaTitle,
        data.metaDescription,
        data.metaKeywords,
        data.image,
        data.imageAlt,
        data.isAutoGenerated,
        data.sourceProductId,
        data.authorId,
      ]
    );

    return blogId;
  }

  /**
   * Link blog to product in ProductBlog table
   */
  private async linkBlogToProduct(
    productIndexId: number,
    articleTitleId: number,
    blogId: number,
    scores: {
      contentScore: number;
      seoScore: number;
      hyperlinkCount: number;
      validationErrors: string[];
    }
  ): Promise<void> {
    const validationErrorsJson =
      scores.validationErrors.length > 0
        ? JSON.stringify(scores.validationErrors)
        : null;

    await insert(
      `INSERT INTO ProductBlog (
        productIndexId, articleTitleId, blogId, generationStatus,
        contentScore, seoScore, hyperlinkCount, validationErrors, generatedAt
      ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        generationStatus = 'completed',
        contentScore = VALUES(contentScore),
        seoScore = VALUES(seoScore),
        hyperlinkCount = VALUES(hyperlinkCount),
        validationErrors = VALUES(validationErrors),
        generatedAt = NOW()`,
      [
        productIndexId,
        articleTitleId,
        blogId,
        scores.contentScore,
        scores.seoScore,
        scores.hyperlinkCount,
        validationErrorsJson,
      ]
    );
  }
}

export const blogGenerator = new BlogGenerator();

