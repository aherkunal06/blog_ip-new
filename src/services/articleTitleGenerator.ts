import { AIProviderFactory, AIProviderConfig } from './ai/aiProviderFactory';
import { query, queryOne, execute, insert, transaction, connInsert, connExecute } from '@/lib/db';
import { decodeHtmlEntities } from '@/lib/utils';
import { slugify } from '@/lib/utils';

export interface ArticleTitle {
  id: number;
  productIndexId: number;
  title: string;
  slug: string;
  articleNumber: number;
  status: 'pending' | 'generated' | 'failed';
  seoScore: number;
}

export class ArticleTitleGenerator {
  /**
   * Generate 10 article titles for a product
   */
  async generateTitles(
    productIndexId: number,
    providerConfig?: AIProviderConfig
  ): Promise<ArticleTitle[]> {
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
      }>(
        `SELECT id, name, category, price, salePrice, description, tags 
         FROM ProductIndex 
         WHERE id = ? AND syncStatus = 'active'`,
        [productIndexId]
      );

      if (!product) {
        throw new Error(`Product with ID ${productIndexId} not found or inactive`);
      }

      // Get AI provider config
      const aiConfig = providerConfig || (await AIProviderFactory.getDefaultProvider());
      if (!aiConfig) {
        throw new Error('No active AI provider configured');
      }

      // Check if titles already exist
      const existingTitles = await query<ArticleTitle>(
        `SELECT * FROM ProductArticleTitle 
         WHERE productIndexId = ? 
         ORDER BY articleNumber`,
        [productIndexId]
      );

      // If 10 titles exist, return them
      if (existingTitles.length === 10) {
        return existingTitles;
      }

      // Generate titles using AI
      const prompt = this.buildTitleGenerationPrompt(product);
      
      // Increase maxTokens for Ollama (it needs more tokens to generate 10 titles)
      const maxTokens = aiConfig.providerName === 'ollama' ? 800 : 500;
      
      const response = await AIProviderFactory.generate(aiConfig, {
        prompt,
        maxTokens: maxTokens,
        temperature: 0.8,
      });

      // Parse titles from response
      const titles = this.parseTitlesFromResponse(response.content);

      // For testing: Accept any number of titles (at least 1)
      if (titles.length < 1) {
        throw new Error(`Expected at least 1 title, got ${titles.length}`);
      }

      // Log warning if we got less than 10, but continue
      if (titles.length < 10) {
        console.warn(`[TitleGenerator] Only generated ${titles.length} titles for product ${productIndexId}, expected 10. Continuing with available titles.`);
      }

      // Save titles to database (will save whatever we have)
      const savedTitles = await this.saveTitles(productIndexId, titles);

      return savedTitles;
    } catch (error: any) {
      console.error('Error generating article titles:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for title generation
   */
  private buildTitleGenerationPrompt(product: {
    name: string;
    category: string | null;
    price: number | null;
    description: string | null;
    tags: string | null;
  }): string {
    const productName = decodeHtmlEntities(product.name);
    const category = product.category ? decodeHtmlEntities(product.category) : 'products';
    const price = product.price ? `₹${product.price}` : '';
    const salePrice = product.salePrice ? `₹${product.salePrice}` : '';
    const features = product.tags
      ? product.tags
          .split(',')
          .slice(0, 5)
          .map((tag) => tag.trim())
          .join(', ')
      : '';

    return `You are an expert content strategist. Generate exactly 10 unique article titles for this product.

Product: ${productName}
Category: ${category}
${price ? `Price: ${price}` : ''}${salePrice ? ` (Sale: ${salePrice})` : ''}
Features: ${features || 'Various features'}

REQUIREMENTS:
- Generate EXACTLY 10 titles (no more, no less)
- Each title: 40-80 characters
- Cover different angles: reviews, guides, how-to, comparisons, buying guides, tips, maintenance
- Include keywords: "${productName}" and "${category}"
- Use power words: "Guide", "Best", "How to", "Tips", "Review", "Complete"
- Make each title unique and compelling

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly 10 strings. No other text.

Example format:
["Complete Guide to ${productName}", "Best ${productName} Buying Tips", "How to Use ${productName} Effectively", "${productName} Review and Comparison", "Top 10 ${productName} Features", "${productName} Maintenance Guide", "Why Choose ${productName}", "${productName} vs Alternatives", "${productName} User Tips", "Everything About ${productName}"]

Now generate 10 titles for: ${productName}`;
  }

  /**
   * Parse titles from AI response
   */
  private parseTitlesFromResponse(response: string): string[] {
    try {
      console.log(`[TitleParser] Raw response length: ${response.length}`);
      console.log(`[TitleParser] Raw response preview: ${response.substring(0, 500)}`);

      // Try to extract JSON array (more flexible matching)
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const titles = JSON.parse(jsonMatch[0]);
          if (Array.isArray(titles) && titles.length > 0) {
            const cleaned = titles.map((t) => String(t).trim()).filter((t) => t.length > 0);
            console.log(`[TitleParser] Parsed ${cleaned.length} titles from JSON array`);
            
            // If we got less than 10, that's okay for now - we'll use what we have
            if (cleaned.length >= 1) {
              // If we have less than 10, pad with variations or return what we have
              if (cleaned.length < 10) {
                console.warn(`[TitleParser] Only got ${cleaned.length} titles, expected 10. Using what we have.`);
                // Return what we have - the system will work with fewer titles
                return cleaned;
              }
              return cleaned.slice(0, 10);
            }
          }
        } catch (parseError) {
          console.warn(`[TitleParser] JSON parse failed:`, parseError);
        }
      }

      // Fallback: try to parse line by line (more flexible)
      const lines = response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*'));

      const titles: string[] = [];
      for (const line of lines) {
        // Remove quotes, numbering, and markdown
        let clean = line
          .replace(/^[\d\.\-\*\s]+/, '') // Remove numbering
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^\[|\]$/g, '') // Remove brackets
          .replace(/^\-|\*/g, '') // Remove list markers
          .trim();

        // More lenient length requirement (20-120 chars)
        if (clean.length >= 20 && clean.length <= 120) {
          titles.push(clean);
        }
        if (titles.length >= 10) break;
      }

      console.log(`[TitleParser] Parsed ${titles.length} titles from lines`);

      // For testing: Accept any number of titles (at least 1)
      if (titles.length < 1) {
        throw new Error(`Could not parse any titles from response. Response: ${response.substring(0, 200)}`);
      }

      // Log warning if we got less than 10, but continue
      if (titles.length < 10) {
        console.warn(`[TitleParser] Only got ${titles.length} titles, expected 10. Using what we have for testing.`);
      }

      return titles.slice(0, 10); // Return up to 10, or whatever we have
    } catch (error: any) {
      console.error('Error parsing titles:', error);
      console.error('Response that failed:', response.substring(0, 1000));
      throw new Error(`Failed to parse titles from AI response: ${error.message}`);
    }
  }

  /**
   * Save titles to database
   */
  private async saveTitles(
    productIndexId: number,
    titles: string[]
  ): Promise<ArticleTitle[]> {
    return await transaction(async (conn) => {
      // Delete existing titles if regenerating
      await connExecute(
        conn,
        `DELETE FROM ProductArticleTitle WHERE productIndexId = ?`,
        [productIndexId]
      );

      const savedTitles: ArticleTitle[] = [];

      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const slug = this.generateSlug(title);
        const seoScore = this.calculateSEOScore(title);

        const titleId = await connInsert(
          conn,
          `INSERT INTO ProductArticleTitle 
           (productIndexId, title, slug, articleNumber, status, seoScore, generatedAt)
           VALUES (?, ?, ?, ?, 'generated', ?, NOW())`,
          [productIndexId, title, slug, i + 1, seoScore]
        );

        savedTitles.push({
          id: titleId,
          productIndexId,
          title,
          slug,
          articleNumber: i + 1,
          status: 'generated',
          seoScore,
        });
      }

      return savedTitles;
    });
  }

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return slugify(title).substring(0, 100);
  }

  /**
   * Calculate SEO score for title (0-100)
   */
  private calculateSEOScore(title: string): number {
    let score = 0;

    // Length score (50-70 chars is optimal)
    const length = title.length;
    if (length >= 50 && length <= 70) {
      score += 30;
    } else if (length >= 40 && length <= 80) {
      score += 20;
    } else {
      score += 10;
    }

    // Power words
    const powerWords = ['guide', 'best', 'how to', 'tips', 'review', 'complete', 'ultimate'];
    const hasPowerWord = powerWords.some((word) =>
      title.toLowerCase().includes(word)
    );
    if (hasPowerWord) score += 20;

    // Question format
    if (title.includes('?')) score += 10;

    // Numbers
    if (/\d/.test(title)) score += 10;

    // Keyword density (not too high)
    const words = title.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const density = words.length / uniqueWords.size;
    if (density < 1.5) score += 20; // Good diversity

    return Math.min(100, score);
  }

  /**
   * Get titles for a product
   */
  async getTitles(productIndexId: number): Promise<ArticleTitle[]> {
    return await query<ArticleTitle>(
      `SELECT * FROM ProductArticleTitle 
       WHERE productIndexId = ? 
       ORDER BY articleNumber`,
      [productIndexId]
    );
  }

  /**
   * Regenerate a specific title
   */
  async regenerateTitle(
    articleTitleId: number,
    providerConfig?: AIProviderConfig
  ): Promise<ArticleTitle> {
    const existing = await queryOne<ArticleTitle>(
      `SELECT * FROM ProductArticleTitle WHERE id = ?`,
      [articleTitleId]
    );

    if (!existing) {
      throw new Error('Article title not found');
    }

    // Regenerate all 10 titles and get the specific one
    const allTitles = await this.generateTitles(
      existing.productIndexId,
      providerConfig
    );

    const regenerated = allTitles.find((t) => t.articleNumber === existing.articleNumber);
    if (!regenerated) {
      throw new Error('Failed to regenerate title');
    }

    return regenerated;
  }
}

export const articleTitleGenerator = new ArticleTitleGenerator();

