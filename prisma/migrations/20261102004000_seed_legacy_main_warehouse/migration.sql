-- Preserve existing aggregate inventory in a real default warehouse.
INSERT INTO "Warehouse" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES ('legacy-main-warehouse', 'MAIN', 'المستودع الرئيسي', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "WarehouseStock" ("id", "warehouseId", "productId", "quantity", "updatedAt")
SELECT
  'legacy-stock-' || p."id",
  w."id",
  p."id",
  p."stockQuantity",
  CURRENT_TIMESTAMP
FROM "Product" p
CROSS JOIN "Warehouse" w
WHERE w."code" = 'MAIN'
  AND p."kind" = 'PHYSICAL'
  AND p."stockQuantity" > 0
ON CONFLICT ("warehouseId", "productId")
DO UPDATE SET "quantity" = EXCLUDED."quantity", "updatedAt" = CURRENT_TIMESTAMP;
