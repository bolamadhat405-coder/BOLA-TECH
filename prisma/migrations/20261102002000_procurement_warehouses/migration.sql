CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "contactName" TEXT, "email" TEXT, "phone" TEXT, "taxNumber" TEXT, "address" TEXT, "currency" TEXT NOT NULL DEFAULT 'EGP', "paymentTerms" TEXT, "notes" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "address" TEXT, "managerName" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WarehouseStock" (
  "id" TEXT NOT NULL, "warehouseId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL, "number" TEXT NOT NULL, "supplierId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "currency" TEXT NOT NULL DEFAULT 'EGP', "subtotal" INTEGER NOT NULL DEFAULT 0, "notes" TEXT, "orderedAt" TIMESTAMP(3), "expectedAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PurchaseOrderItem" (
  "id" TEXT NOT NULL, "purchaseOrderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantityOrdered" INTEGER NOT NULL, "quantityReceived" INTEGER NOT NULL DEFAULT 0, "unitCost" INTEGER NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockTransfer" (
  "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "fromWarehouseId" TEXT NOT NULL, "toWarehouseId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "notes" TEXT, "shippedAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockTransferItem" (
  "id" TEXT NOT NULL, "transferId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
CREATE INDEX "Warehouse_isActive_idx" ON "Warehouse"("isActive");
CREATE UNIQUE INDEX "WarehouseStock_warehouseId_productId_key" ON "WarehouseStock"("warehouseId","productId");
CREATE INDEX "WarehouseStock_productId_idx" ON "WarehouseStock"("productId");
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");
CREATE INDEX "PurchaseOrder_supplierId_createdAt_idx" ON "PurchaseOrder"("supplierId","createdAt");
CREATE INDEX "PurchaseOrder_warehouseId_status_idx" ON "PurchaseOrder"("warehouseId","status");
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");
CREATE UNIQUE INDEX "StockTransfer_reference_key" ON "StockTransfer"("reference");
CREATE INDEX "StockTransfer_status_createdAt_idx" ON "StockTransfer"("status","createdAt");
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
