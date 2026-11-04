CREATE TABLE "OrderItemWarehouseAllocation" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "OrderItemWarehouseAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderItemWarehouseAllocation_orderItemId_warehouseId_key" ON "OrderItemWarehouseAllocation"("orderItemId","warehouseId");
CREATE INDEX "OrderItemWarehouseAllocation_warehouseId_idx" ON "OrderItemWarehouseAllocation"("warehouseId");
ALTER TABLE "OrderItemWarehouseAllocation" ADD CONSTRAINT "OrderItemWarehouseAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItemWarehouseAllocation" ADD CONSTRAINT "OrderItemWarehouseAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
