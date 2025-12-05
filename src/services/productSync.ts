// src/services/productSync.ts
// Product synchronization service for syncing products from OpenCart database

import { query, queryOne, insert, execute, transaction, connQuery, connExecute, connInsert } from "@/lib/db";
import { opencartQuery, opencartQueryOne } from "@/lib/opencart-db";
import { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

interface IpshopyProduct {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price?: number;
  salePrice?: number;
  description?: string;
  category?: string;
  tags?: string[];
  stockStatus?: "in_stock" | "out_of_stock" | "preorder";
  rating?: number;
  reviewCount?: number;
  url: string;
}

interface OpenCartProduct {
  product_id: number;
  name: string;
  description: string;
  price: number;
  special_price: number | null;
  image: string | null;
  quantity: number;
  stock_status_id: number;
  status: number;
  category: string | null;
  tags: string | null;
  keyword: string | null;
  viewed: number;
}

interface IpshopyProductWithViews extends IpshopyProduct {
  viewed?: number;
}

interface SyncResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  duration: number;
}

interface SyncConfig {
  apiUrl: string; // ipshopy.com API endpoint
  apiKey?: string;
  batchSize?: number;
}

interface SyncProgress {
  isRunning: boolean;
  total: number;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  currentBatch: number;
  totalBatches: number;
  startTime: number;
  logId: number | null;
}

export class ProductSyncService {
  private config: SyncConfig;
  private currentProgress: SyncProgress | null = null;

  constructor(config: SyncConfig) {
    this.config = {
      batchSize: 100,
      ...config,
    };
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress | null {
    return this.currentProgress;
  }

  /**
   * Check if sync is currently running
   */
  isSyncRunning(): boolean {
    return this.currentProgress?.isRunning || false;
  }

  /**
   * Fetch products from OpenCart database
   */
  private async fetchProductsFromDatabase(): Promise<IpshopyProduct[]> {
    try {
      const baseUrl = process.env.IPSHOPY_BASE_URL || "https://ipshopy.com";
      const imageBaseUrl = process.env.IPSHOPY_IMAGE_BASE_URL || "https://ipshopy.com/image/";

      // Diagnostic: Check total products and status distribution
      try {
        const diagnosticSql = `
          SELECT 
            COUNT(*) as total_products,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as disabled,
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as pending
          FROM oc_product
        `;
        const diagnostics = await opencartQueryOne<any>(diagnosticSql);
        console.log(`[ProductSync] Database diagnostics:`, diagnostics);
      } catch (diagError) {
        console.warn("[ProductSync] Could not run diagnostics:", diagError);
      }

      // Fetch products from OpenCart database
      // Join oc_product, oc_product_description, oc_product_special, oc_seo_url, and oc_product_to_category
      // Only sync active products (status = 1)
      // Note: Using INNER JOIN for product_description - products without descriptions will be excluded
      const sql = `
        SELECT 
          p.product_id,
          pd.name,
          pd.description,
          p.price,
          COALESCE(ps.price, NULL) as special_price,
          p.image,
          p.quantity,
          p.stock_status_id,
          p.status,
          GROUP_CONCAT(DISTINCT cd.name) as category,
          pd.tag as tags,
          su.keyword,
          p.viewed
        FROM oc_product p
        LEFT JOIN oc_product_description pd ON p.product_id = pd.product_id AND pd.language_id = 1
        LEFT JOIN oc_product_special ps ON p.product_id = ps.product_id 
          AND ps.customer_group_id = 1
          AND (ps.date_start = '0000-00-00' OR ps.date_start <= CURDATE())
          AND (ps.date_end = '0000-00-00' OR ps.date_end >= CURDATE())
          AND ps.priority = (
            SELECT MAX(priority) 
            FROM oc_product_special 
            WHERE product_id = p.product_id 
            AND customer_group_id = 1
            AND (date_start = '0000-00-00' OR date_start <= CURDATE())
            AND (date_end = '0000-00-00' OR date_end >= CURDATE())
          )
        LEFT JOIN oc_seo_url su ON su.query = CONCAT('product_id=', p.product_id) 
          AND su.store_id = 0 
          AND su.language_id = 1
        LEFT JOIN oc_product_to_category ptc ON p.product_id = ptc.product_id
        LEFT JOIN oc_category_description cd ON ptc.category_id = cd.category_id AND cd.language_id = 1
        WHERE p.status = 1  -- Only sync active products (1=active, 2=pending, 0=disabled)
        GROUP BY p.product_id, pd.name, pd.description, p.price, ps.price, p.image, 
                 p.quantity, p.stock_status_id, p.status, pd.tag, su.keyword, p.viewed
        ORDER BY p.product_id
        LIMIT 10000  -- Limit to prevent memory issues, adjust if needed
      `;

      const products = await opencartQuery<OpenCartProduct[]>(sql);
      
      console.log(`[ProductSync] Raw query returned ${products.length} products from OpenCart`);
      
      if (products.length === 0) {
        // Try a simpler query to see if we can get any products at all
        const simpleTestSql = `SELECT COUNT(*) as count FROM oc_product WHERE status = 1`;
        const simpleCount = await opencartQueryOne<any>(simpleTestSql);
        console.log(`[ProductSync] Simple count query (status=1):`, simpleCount);
        
        // Try without language_id filter
        const testSql2 = `SELECT COUNT(*) as count FROM oc_product p 
          LEFT JOIN oc_product_description pd ON p.product_id = pd.product_id 
          WHERE p.status = 1`;
        const testCount2 = await opencartQueryOne<any>(testSql2);
        console.log(`[ProductSync] Test query without language_id filter:`, testCount2);
      }

      // Map OpenCart products to IpshopyProduct format
      return products.map((product) => {
        // Determine stock status
        let stockStatus: "in_stock" | "out_of_stock" | "preorder" = "out_of_stock";
        if (product.quantity > 0 && product.stock_status_id === 6) {
          stockStatus = "in_stock";
        } else if (product.quantity === 0 && product.stock_status_id === 6) {
          stockStatus = "preorder";
        }

        // Build product URL from SEO keyword
        const keyword = product.keyword || `product_id=${product.product_id}`;
        const url = `${baseUrl}/${keyword}`;

        // Build image URL
        const imageUrl = product.image 
          ? `${imageBaseUrl}${product.image}`
          : undefined;

        // Parse tags
        const tags = product.tags 
          ? product.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : [];

        // Get category (use first category if multiple) and decode HTML entities
        const category = product.category 
          ? this.decodeHtmlEntities(product.category.split(',')[0].trim())
          : undefined;

        // Ensure we have at least a name (fallback to product_id if name is missing)
        const productName = product.name || `Product ${product.product_id}`;
        
        // Create slug from name (handle null/undefined)
        const slug = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `product-${product.product_id}`;
        
        return {
          id: product.product_id.toString(),
          name: productName,
          slug: slug,
          image: imageUrl,
          price: product.price || undefined,
          salePrice: product.special_price || undefined,
          description: product.description || undefined,
          category: category,
          tags: tags.length > 0 ? tags : undefined,
          stockStatus: stockStatus,
          rating: 0, // OpenCart doesn't have rating in these tables
          reviewCount: 0, // OpenCart doesn't have review count in these tables
          url: url,
          viewed: product.viewed || 0, // Product view count from OpenCart
        };
      });
    } catch (error: any) {
      console.error("Error fetching products from OpenCart database:", error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Decode HTML entities in text
   */
  private decodeHtmlEntities(text: string): string {
    if (!text) return text;
    
    // Common HTML entities
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
    };
    
    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  /**
   * Calculate popularity score for a product
   * Uses OpenCart's viewed count for popularity calculation
   */
  private calculatePopularityScore(product: IpshopyProductWithViews): number {
    let score = 0;

    // Base score from rating
    if (product.rating) {
      score += product.rating * 10; // 0-50 points
    }

    // Review count bonus
    if (product.reviewCount) {
      score += Math.min(product.reviewCount / 10, 20); // Max 20 points
    }

    // View count bonus (from OpenCart viewed field) - Primary popularity indicator
    if (product.viewed && product.viewed > 0) {
      // Logarithmic scale: 100 views = 5 points, 1000 views = 10 points, 10000 views = 15 points, max 20 points
      const viewScore = Math.min(Math.log10(product.viewed + 1) * 5, 20);
      score += viewScore;
    }

    // Stock status bonus
    if (product.stockStatus === "in_stock") {
      score += 10;
    } else if (product.stockStatus === "preorder") {
      score += 5;
    }

    // Sale price bonus (trending products)
    if (product.salePrice && product.price) {
      const discount = ((product.price - product.salePrice) / product.price) * 100;
      if (discount > 20) {
        score += 10; // Big sale bonus
      }
    }

    return Math.min(Math.round(score), 100); // Cap at 100
  }

  /**
   * Sync a single product
   */
  private async syncProduct(
    product: IpshopyProductWithViews,
    connection?: PoolConnection
  ): Promise<{ created: boolean; updated: boolean }> {
    const tagsJson = product.tags ? JSON.stringify(product.tags) : null;
    const popularityScore = this.calculatePopularityScore(product);

    // Check if product exists
    const existing = connection
      ? await connQuery<RowDataPacket[]>(
          connection,
          `SELECT id FROM ProductIndex WHERE ipshopyProductId = ?`,
          [product.id]
        ).then(rows => rows.length > 0 ? rows[0] : null)
      : await queryOne<RowDataPacket>(
          `SELECT id FROM ProductIndex WHERE ipshopyProductId = ?`,
          [product.id]
        );

    if (existing) {
      // Update existing product
      const updateSql = `
        UPDATE ProductIndex SET
          name = ?,
          slug = ?,
          image = ?,
          price = ?,
          salePrice = ?,
          description = ?,
          category = ?,
          tags = ?,
          stockStatus = ?,
          rating = ?,
          reviewCount = ?,
          popularityScore = ?,
          ipshopyUrl = ?,
          lastSyncedAt = NOW(),
          syncStatus = 'active',
          syncError = NULL,
          updatedAt = NOW()
        WHERE id = ?
      `;

      const params = [
        product.name,
        product.slug,
        product.image || null,
        product.price || null,
        product.salePrice || null,
        product.description || null,
        product.category || null,
        tagsJson,
        product.stockStatus || null,
        product.rating || 0,
        product.reviewCount || 0,
        popularityScore,
        product.url,
        existing.id,
      ];

      if (connection) {
        await connExecute(connection, updateSql, params);
      } else {
        await execute(updateSql, params);
      }

      return { created: false, updated: true };
    } else {
      // Insert new product
      const insertSql = `
        INSERT INTO ProductIndex (
          ipshopyProductId, name, slug, image, price, salePrice,
          description, category, tags, stockStatus, rating, reviewCount,
          popularityScore, ipshopyUrl, lastSyncedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')
      `;

      const params = [
        product.id,
        product.name,
        product.slug,
        product.image || null,
        product.price || null,
        product.salePrice || null,
        product.description || null,
        product.category || null,
        tagsJson,
        product.stockStatus || null,
        product.rating || 0,
        product.reviewCount || 0,
        popularityScore,
        product.url,
      ];

      if (connection) {
        await connInsert(connection, insertSql, params);
      } else {
        await insert(insertSql, params);
      }

      return { created: true, updated: false };
    }
  }

  /**
   * Mark products as deleted if they're no longer in the API
   */
  private async markDeletedProducts(
    activeProductIds: string[],
    connection?: any
  ): Promise<number> {
    if (activeProductIds.length === 0) {
      return 0;
    }

    const placeholders = activeProductIds.map(() => "?").join(",");
    const sql = `
      UPDATE ProductIndex 
      SET syncStatus = 'deleted', updatedAt = NOW()
      WHERE ipshopyProductId NOT IN (${placeholders})
      AND syncStatus = 'active'
    `;

    if (connection) {
      return await connExecute(connection, sql, activeProductIds);
    } else {
      return await execute(sql, activeProductIds);
    }
  }

  /**
   * Main sync function
   */
  async syncAllProducts(syncType: "manual" | "scheduled" = "scheduled"): Promise<SyncResult> {
    // Prevent concurrent syncs
    if (this.currentProgress?.isRunning) {
      throw new Error("Sync is already running. Please wait for the current sync to complete.");
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let logId: number | null = null;

    try {
      // Log sync start
      logId = await insert(
        `INSERT INTO ProductSyncLog (syncType, status, startedAt) VALUES (?, 'success', NOW())`,
        [syncType]
      );

      // Fetch products from OpenCart database
      const products = await this.fetchProductsFromDatabase();
      console.log(`[ProductSync] Fetched ${products.length} products from OpenCart database`);
      
      if (products.length === 0) {
        console.warn("[ProductSync] WARNING: No products found in OpenCart database. Check your query conditions.");
        // Log a warning but don't fail - might be intentional
      }
      
      const activeProductIds = products.map((p) => p.id);
      const totalProducts = products.length;
      const batchSize = this.config.batchSize || 100;
      const totalBatches = Math.ceil(totalProducts / batchSize);

      // Initialize progress tracking
      this.currentProgress = {
        isRunning: true,
        total: totalProducts,
        processed: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [],
        currentBatch: 0,
        totalBatches: totalBatches,
        startTime: startTime,
        logId: logId,
      };

      // Sync products in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;

        // Update progress
        if (this.currentProgress) {
          this.currentProgress.currentBatch = currentBatch;
        }

        await transaction(async (connection) => {
          for (const product of batch) {
            try {
              const result = await this.syncProduct(product, connection);
              processed++;
              if (result.created) created++;
              if (result.updated) updated++;
              
              // Update progress
              if (this.currentProgress) {
                this.currentProgress.processed = processed;
                this.currentProgress.created = created;
                this.currentProgress.updated = updated;
              }
            } catch (error: any) {
              errors.push(`Product ${product.id}: ${error.message}`);
              console.error(`Error syncing product ${product.id}:`, error);
              
              // Update progress errors
              if (this.currentProgress) {
                this.currentProgress.errors.push(`Product ${product.id}: ${error.message}`);
              }
            }
          }
        });
      }

      // Mark deleted products
      try {
        deleted = await this.markDeletedProducts(activeProductIds);
        if (this.currentProgress) {
          this.currentProgress.deleted = deleted;
        }
      } catch (error: any) {
        errors.push(`Error marking deleted products: ${error.message}`);
        if (this.currentProgress) {
          this.currentProgress.errors.push(`Error marking deleted products: ${error.message}`);
        }
      }

      // Update sync log
      const duration = Math.round((Date.now() - startTime) / 1000);
      await execute(
        `UPDATE ProductSyncLog SET 
          status = ?,
          productsProcessed = ?,
          productsCreated = ?,
          productsUpdated = ?,
          productsDeleted = ?,
          errorMessage = ?,
          completedAt = NOW(),
          durationSeconds = ?
        WHERE id = ?`,
        [
          errors.length > 0 ? "partial" : "success",
          processed,
          created,
          updated,
          deleted,
          errors.length > 0 ? errors.join("; ") : null,
          duration,
          logId,
        ]
      );

      // Clear progress
      this.currentProgress = null;

      return {
        success: errors.length === 0,
        processed,
        created,
        updated,
        deleted,
        errors,
        duration,
      };
    } catch (error: any) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      errors.push(error.message);

      // Log error
      try {
        if (logId) {
          await execute(
            `UPDATE ProductSyncLog SET 
              status = 'error',
              productsProcessed = ?,
              errorMessage = ?,
              completedAt = NOW(),
              durationSeconds = ?
            WHERE id = ?`,
            [processed, error.message, duration, logId]
          );
        } else {
          await insert(
            `INSERT INTO ProductSyncLog (
              syncType, status, productsProcessed, errorMessage, 
              startedAt, completedAt, durationSeconds
            ) VALUES (?, 'error', ?, ?, NOW(), NOW(), ?)`,
            [syncType, processed, error.message, duration]
          );
        }
      } catch (logError) {
        console.error("Error logging sync failure:", logError);
      }

      // Clear progress
      this.currentProgress = null;

      return {
        success: false,
        processed,
        created,
        updated,
        deleted,
        errors,
        duration,
      };
    }
  }

  /**
   * Sync a single product by ID from OpenCart database
   */
  async syncProductById(productId: string): Promise<boolean> {
    try {
      const baseUrl = process.env.IPSHOPY_BASE_URL || "https://ipshopy.com";
      const imageBaseUrl = process.env.IPSHOPY_IMAGE_BASE_URL || "https://ipshopy.com/image/";

      const sql = `
        SELECT 
          p.product_id,
          pd.name,
          pd.description,
          p.price,
          COALESCE(ps.price, NULL) as special_price,
          p.image,
          p.quantity,
          p.stock_status_id,
          p.status,
          GROUP_CONCAT(DISTINCT cd.name) as category,
          pd.tag as tags,
          su.keyword,
          p.viewed
        FROM oc_product p
        LEFT JOIN oc_product_description pd ON p.product_id = pd.product_id AND pd.language_id = 1
        LEFT JOIN oc_product_special ps ON p.product_id = ps.product_id 
          AND ps.customer_group_id = 1
          AND (ps.date_start = '0000-00-00' OR ps.date_start <= CURDATE())
          AND (ps.date_end = '0000-00-00' OR ps.date_end >= CURDATE())
          AND ps.priority = (
            SELECT MAX(priority) 
            FROM oc_product_special 
            WHERE product_id = p.product_id 
            AND customer_group_id = 1
            AND (date_start = '0000-00-00' OR date_start <= CURDATE())
            AND (date_end = '0000-00-00' OR date_end >= CURDATE())
          )
        LEFT JOIN oc_seo_url su ON su.query = CONCAT('product_id=', p.product_id) 
          AND su.store_id = 0 
          AND su.language_id = 1
        LEFT JOIN oc_product_to_category ptc ON p.product_id = ptc.product_id
        LEFT JOIN oc_category_description cd ON ptc.category_id = cd.category_id AND cd.language_id = 1
        WHERE p.product_id = ? AND p.status = 1  -- Only sync active products (1=active, 2=pending, 0=disabled)
        GROUP BY p.product_id, pd.name, pd.description, p.price, ps.price, p.image, 
                 p.quantity, p.stock_status_id, p.status, pd.tag, su.keyword, p.viewed
      `;

      const product = await opencartQueryOne<OpenCartProduct>(sql, [parseInt(productId)]);

      if (!product) {
        throw new Error(`Product ${productId} not found in OpenCart database`);
      }

      // Map to IpshopyProduct format
      let stockStatus: "in_stock" | "out_of_stock" | "preorder" = "out_of_stock";
      if (product.quantity > 0 && product.stock_status_id === 6) {
        stockStatus = "in_stock";
      } else if (product.quantity === 0 && product.stock_status_id === 6) {
        stockStatus = "preorder";
      }

      const keyword = product.keyword || `product_id=${product.product_id}`;
      const url = `${baseUrl}/${keyword}`;
      const imageUrl = product.image ? `${imageBaseUrl}${product.image}` : undefined;
      const tags = product.tags 
        ? product.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      const category = product.category ? this.decodeHtmlEntities(product.category.split(',')[0].trim()) : undefined;
      const productName = product.name || `Product ${product.product_id}`;
      const slug = productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `product-${product.product_id}`;

      const ipshopyProduct: IpshopyProductWithViews = {
        id: product.product_id.toString(),
        name: productName,
        slug: slug,
        image: imageUrl,
        price: product.price || undefined,
        salePrice: product.special_price || undefined,
        description: product.description || undefined,
        category: category,
        tags: tags.length > 0 ? tags : undefined,
        stockStatus: stockStatus,
        rating: 0,
        reviewCount: 0,
        url: url,
        viewed: product.viewed || 0,
      };

      await this.syncProduct(ipshopyProduct);
      return true;
    } catch (error: any) {
      console.error(`Error syncing product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    totalProducts: number;
    activeProducts: number;
    deletedProducts: number;
    lastSyncLog: any;
  }> {
    const lastSyncLog = await queryOne<RowDataPacket>(
      `SELECT * FROM ProductSyncLog ORDER BY startedAt DESC LIMIT 1`
    );

    const stats = await queryOne<RowDataPacket>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN syncStatus = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN syncStatus = 'deleted' THEN 1 ELSE 0 END) as deleted
      FROM ProductIndex`
    );

    return {
      lastSync: lastSyncLog?.startedAt || null,
      totalProducts: Number(stats?.total || 0),
      activeProducts: Number(stats?.active || 0),
      deletedProducts: Number(stats?.deleted || 0),
      lastSyncLog: lastSyncLog || null,
    };
  }
}

// Export singleton instance
export const productSyncService = new ProductSyncService({
  apiUrl: process.env.IPSHOPY_API_URL || "https://ipshopy.com",
  apiKey: process.env.IPSHOPY_API_KEY,
});

