

# Delete Duplicate SKUs with Blender Numbers from Product Catalog

## Problem
The `products` table has 83 entries with blender number suffixes (e.g. `ABEBADB-B1`, `ABESP - B2`, `BFMG6V - B3`) that are duplicates of the original base SKU. These were likely saved to the catalog from Planner sessions where users appended batch/blender identifiers to the SKU code.

## What will be done

Run a single SQL migration to delete all 83 product catalog entries where the `product_code` ends with a blender suffix pattern like `-B1`, `-B2`, `- B3`, etc.

```sql
DELETE FROM products
WHERE product_code ~ '[\s-]+B\d+$';
```

This keeps all original/base SKUs intact (2,134 total → ~2,051 after cleanup).

No other tables reference these product codes via foreign keys, so no cascading issues.

## Prevention
Additionally, update the Planner's "Save to product catalog" logic in `SkuRowForm.tsx` to strip blender suffixes before saving new products, preventing this from happening again. The batch number is already stored in a separate `batchNumber` field — it should never be part of the SKU code saved to the catalog.

