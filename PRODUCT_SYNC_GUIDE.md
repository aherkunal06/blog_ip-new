# Product Sync Guide

## Issue Fixed
The 500 errors you were seeing were caused by empty ProductIndex table. The API endpoints have been updated to handle empty data gracefully and return empty arrays instead of errors.

## What Was Changed
Updated the following API endpoints to handle empty data:
- `/api/products/index` - Now handles comparison operators (>=, >, <=, <) for adminPriority
- `/api/blogs/with-products` - Returns empty array when no products exist
- `/api/blogs/categories/trending` - Returns empty array when no categories exist
- `/api/products/categories` - Returns empty array when no products exist
- `/api/events/upcoming` - Returns empty array when no events exist

## Next Steps: Sync Products

To populate your ProductIndex table with products, you need to sync from your OpenCart database:

### 1. Configure OpenCart Database Connection

Add these variables to your `.env.local` file:

```env
# OpenCart Database (for product sync)
OPENCART_DB_HOST=localhost
OPENCART_DB_PORT=3306
OPENCART_DB_USER=root
OPENCART_DB_PASSWORD=your_password
OPENCART_DB_NAME=sagar
```

### 2. Trigger Product Sync

You have two options:

#### Option A: Via API (Requires Admin Authentication)
```bash
# POST to sync endpoint
curl -X POST http://localhost:3000/api/products/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "manual"}'
```

#### Option B: Via Cron Job
```bash
# GET the cron endpoint
curl http://localhost:3000/api/cron/sync-products
```

### 3. Check Sync Status

```bash
# GET sync status
curl http://localhost:3000/api/products/sync
```

## Database Requirements

The OpenCart database should have these tables:
- `oc_product` - Main product table
- `oc_product_description` - Product names and descriptions
- `oc_product_special` - Special prices/sales
- `oc_seo_url` - SEO-friendly URLs
- `oc_product_to_category` - Product-category relationships
- `oc_category_description` - Category names

## Current Status

- **Blog Database**: Connected ✓
- **ProductIndex Table**: Empty (0 products)
- **Blog Table**: 25 blogs
- **Category Table**: 3 categories
- **Event Table**: 2 events

Once you sync products, the homepage and product-related features will work properly.
