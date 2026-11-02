-- Company operations domain: customers, catalog, orders, delivery, finance, HR and support.
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT','PENDING','CONFIRMED','PROCESSING','READY','SHIPPED','COMPLETED','CANCELLED','REFUNDED');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID');
CREATE TYPE "StockMovementType" AS ENUM ('IN','PURCHASE','SALE','RETURN','ADJUSTMENT');

CREATE TABLE "Customer" (
"id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT,"phone" TEXT,"company" TEXT,"address" TEXT,"notes" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

CREATE TABLE "Product" (
"id" TEXT NOT NULL,"sku" TEXT NOT NULL,"slug" TEXT NOT NULL,"nameAr" TEXT NOT NULL,"nameEn" TEXT NOT NULL,"descriptionAr" TEXT NOT NULL DEFAULT '',"descriptionEn" TEXT NOT NULL DEFAULT '',"category" TEXT NOT NULL,"kind" TEXT NOT NULL DEFAULT 'PHYSICAL',"priceMinor" INTEGER NOT NULL,"costMinor" INTEGER NOT NULL DEFAULT 0,"currency" TEXT NOT NULL DEFAULT 'EGP',"stockQuantity" INTEGER NOT NULL DEFAULT 0,"lowStockAt" INTEGER NOT NULL DEFAULT 3,"isPublished" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Product_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_category_isPublished_idx" ON "Product"("category","isPublished");
CREATE INDEX "Product_nameAr_nameEn_idx" ON "Product"("nameAr","nameEn");

CREATE TABLE "Order" (
"id" TEXT NOT NULL,"reference" TEXT NOT NULL,"customerId" TEXT NOT NULL,"status" "OrderStatus" NOT NULL DEFAULT 'PENDING',"subtotal" INTEGER NOT NULL,"discount" INTEGER NOT NULL DEFAULT 0,"total" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'EGP',"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Order_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId","createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status","createdAt");

CREATE TABLE "OrderItem" (
"id" TEXT NOT NULL,"orderId" TEXT NOT NULL,"productId" TEXT,"title" TEXT NOT NULL,"quantity" INTEGER NOT NULL,"unitPrice" INTEGER NOT NULL,"lineTotal" INTEGER NOT NULL,
CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"));
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

CREATE TABLE "Project" (
"id" TEXT NOT NULL,"code" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"status" "ProjectStatus" NOT NULL DEFAULT 'PLANNED',"budget" INTEGER,"currency" TEXT NOT NULL DEFAULT 'EGP',"startAt" TIMESTAMP(3),"dueAt" TIMESTAMP(3),"customerId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Project_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
CREATE INDEX "Project_status_dueAt_idx" ON "Project"("status","dueAt");
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

CREATE TABLE "ProjectTask" (
"id" TEXT NOT NULL,"projectId" TEXT NOT NULL,"title" TEXT NOT NULL,"description" TEXT,"status" TEXT NOT NULL DEFAULT 'TODO',"priority" TEXT NOT NULL DEFAULT 'MEDIUM',"assignee" TEXT,"dueAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ProjectTask_projectId_status_idx" ON "ProjectTask"("projectId","status");
CREATE INDEX "ProjectTask_assignee_dueAt_idx" ON "ProjectTask"("assignee","dueAt");

CREATE TABLE "Invoice" (
"id" TEXT NOT NULL,"number" TEXT NOT NULL,"customerId" TEXT NOT NULL,"orderId" TEXT,"status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',"subtotal" INTEGER NOT NULL,"tax" INTEGER NOT NULL DEFAULT 0,"total" INTEGER NOT NULL,"paid" INTEGER NOT NULL DEFAULT 0,"currency" TEXT NOT NULL DEFAULT 'EGP',"issuedAt" TIMESTAMP(3),"dueAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE INDEX "Invoice_customerId_createdAt_idx" ON "Invoice"("customerId","createdAt");
CREATE INDEX "Invoice_status_dueAt_idx" ON "Invoice"("status","dueAt");

CREATE TABLE "Expense" (
"id" TEXT NOT NULL,"title" TEXT NOT NULL,"category" TEXT NOT NULL,"amount" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'EGP',"vendor" TEXT,"reference" TEXT,"notes" TEXT,"incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Expense_category_incurredAt_idx" ON "Expense"("category","incurredAt");

CREATE TABLE "StockMovement" (
"id" TEXT NOT NULL,"productId" TEXT NOT NULL,"type" "StockMovementType" NOT NULL,"quantity" INTEGER NOT NULL,"unitCost" INTEGER,"reference" TEXT,"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"));
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId","createdAt");

CREATE TABLE "Employee" (
"id" TEXT NOT NULL,"employeeNo" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT,"phone" TEXT,"jobTitle" TEXT NOT NULL,"department" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"hiredAt" TIMESTAMP(3),"salaryMinor" INTEGER,"currency" TEXT NOT NULL DEFAULT 'EGP',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Employee_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE INDEX "Employee_department_status_idx" ON "Employee"("department","status");

CREATE TABLE "SupportTicket" (
"id" TEXT NOT NULL,"reference" TEXT NOT NULL,"customerId" TEXT NOT NULL,"subject" TEXT NOT NULL,"description" TEXT NOT NULL,"status" "TicketStatus" NOT NULL DEFAULT 'OPEN',"priority" TEXT NOT NULL DEFAULT 'NORMAL',"assignedTo" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "SupportTicket_reference_key" ON "SupportTicket"("reference");
CREATE INDEX "SupportTicket_status_priority_updatedAt_idx" ON "SupportTicket"("status","priority","updatedAt");
CREATE INDEX "SupportTicket_customerId_createdAt_idx" ON "SupportTicket"("customerId","createdAt");

CREATE TABLE "Contract" (
"id" TEXT NOT NULL,"number" TEXT NOT NULL,"title" TEXT NOT NULL,"customerId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',"value" INTEGER,"currency" TEXT NOT NULL DEFAULT 'EGP',"startsAt" TIMESTAMP(3),"endsAt" TIMESTAMP(3),"terms" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Contract_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");
CREATE INDEX "Contract_customerId_status_idx" ON "Contract"("customerId","status");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
