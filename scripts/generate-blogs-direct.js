// Direct script to generate blogs for products
// This bypasses the API and directly uses the services

require('dotenv').config({ path: '.env.local' });

const { autoBlogService } = require('../src/services/autoBlogService');
const { AIProviderFactory } = require('../src/services/ai/aiProviderFactory');
const { queryOne } = require('../src/lib/db');

const productNames = [
  "ENSURE High Protein Health Drink, Chocolate 200g | Protein Drink for Active Adults | Muscle Recovery & Meal Replacement",
  "Ensure Chocolate Nutritional Supplement Drink | High Protein | 32 Nutrients | 950g | Adult Health"
];

async function generateBlogs() {
  try {
    console.log('🚀 Starting blog generation...\n');

    // Get default AI provider
    const providerConfig = await AIProviderFactory.getDefaultProvider();
    if (!providerConfig) {
      console.error('❌ No active AI provider configured');
      process.exit(1);
    }

    console.log(`✅ Using AI Provider: ${providerConfig.providerName}\n`);

    const results = [];

    for (const productName of productNames) {
      console.log(`\n📦 Searching for product: ${productName.substring(0, 60)}...`);
      
      try {
        // Search for product
        const product = await queryOne(
          `SELECT id, name FROM ProductIndex 
           WHERE syncStatus = 'active' 
           AND (name LIKE ? OR name LIKE ?)
           LIMIT 1`,
          [`%${productName}%`, `%${productName.replace(/&amp;/g, '&')}%`]
        );

        if (!product) {
          console.log(`❌ Product not found: ${productName}`);
          results.push({
            productName,
            status: 'not_found',
            error: 'Product not found in ProductIndex'
          });
          continue;
        }

        console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);
        console.log(`📝 Generating 10 titles and 10 articles...`);

        // Generate blogs
        const generationResult = await autoBlogService.generateAllForProduct(
          product.id,
          {
            regenerateTitles: false,
            regenerateArticles: false,
            skipExisting: true,
            providerConfig,
          }
        );

        console.log(`✅ Generation complete!`);
        console.log(`   - Titles: ${generationResult.titlesGenerated}`);
        console.log(`   - Articles: ${generationResult.articlesGenerated}`);
        console.log(`   - Hyperlinks: ${generationResult.totalHyperlinks}`);
        console.log(`   - Status: ${generationResult.status}`);

        if (generationResult.errors.length > 0) {
          console.log(`   - Errors: ${generationResult.errors.length}`);
          generationResult.errors.slice(0, 3).forEach(err => {
            console.log(`     • ${err}`);
          });
        }

        results.push({
          productName,
          productIndexId: product.id,
          status: 'success',
          ...generationResult
        });

      } catch (error) {
        console.error(`❌ Error for product "${productName}":`, error.message);
        results.push({
          productName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(50));
    const summary = {
      total: productNames.length,
      success: results.filter(r => r.status === 'success').length,
      notFound: results.filter(r => r.status === 'not_found').length,
      errors: results.filter(r => r.status === 'error').length,
      totalTitles: results.reduce((sum, r) => sum + (r.titlesGenerated || 0), 0),
      totalArticles: results.reduce((sum, r) => sum + (r.articlesGenerated || 0), 0),
      totalHyperlinks: results.reduce((sum, r) => sum + (r.totalHyperlinks || 0), 0),
    };

    console.log(`Total Products: ${summary.total}`);
    console.log(`✅ Success: ${summary.success}`);
    console.log(`❌ Not Found: ${summary.notFound}`);
    console.log(`⚠️  Errors: ${summary.errors}`);
    console.log(`📝 Total Titles Generated: ${summary.totalTitles}`);
    console.log(`📄 Total Articles Generated: ${summary.totalArticles}`);
    console.log(`🔗 Total Hyperlinks: ${summary.totalHyperlinks}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

generateBlogs();

