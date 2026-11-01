CREATE TYPE "WorkspaceArea" AS ENUM ('CRM','PROJECTS','FINANCE','INVENTORY','HR','SALES','SUPPORT');
CREATE TABLE "WorkspaceRecord" (
  "id" TEXT NOT NULL,
  "area" "WorkspaceArea" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reference" TEXT,
  "customer" TEXT,
  "owner" TEXT,
  "amountMinor" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "dueAt" TIMESTAMP(3),
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceRecord_reference_key" ON "WorkspaceRecord"("reference");
CREATE INDEX "WorkspaceRecord_area_status_updatedAt_idx" ON "WorkspaceRecord"("area","status","updatedAt");
CREATE INDEX "WorkspaceRecord_customer_idx" ON "WorkspaceRecord"("customer");
CREATE INDEX "WorkspaceRecord_dueAt_idx" ON "WorkspaceRecord"("dueAt");
