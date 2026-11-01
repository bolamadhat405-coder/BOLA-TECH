CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REVIEWING', 'WAITING_FOR_CUSTOMER', 'APPROVED', 'IN_PROGRESS', 'READY_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'ADMIN', 'CUSTOMER');

CREATE TABLE "Inquiry" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "message" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "source" TEXT NOT NULL DEFAULT 'website',
  "consentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
  "actorLabel" TEXT NOT NULL DEFAULT 'System',
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InquiryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DigitalProduct" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "deliveryType" TEXT NOT NULL,
  "priceMinor" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "requiresReview" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DigitalProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorType" "AuditActorType" NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Inquiry_reference_key" ON "Inquiry"("reference");
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");
CREATE INDEX "Inquiry_email_createdAt_idx" ON "Inquiry"("email", "createdAt");
CREATE INDEX "InquiryEvent_inquiryId_createdAt_idx" ON "InquiryEvent"("inquiryId", "createdAt");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX "DigitalProduct_slug_key" ON "DigitalProduct"("slug");
CREATE INDEX "DigitalProduct_isPublished_category_idx" ON "DigitalProduct"("isPublished", "category");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "InquiryEvent" ADD CONSTRAINT "InquiryEvent_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
