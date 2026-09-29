-- CreateEnum
CREATE TYPE "MaterialKind" AS ENUM ('BARRA_REDONDA', 'TUBO', 'COMPONENTE', 'SERVICO', 'INSUMO');

-- CreateEnum
CREATE TYPE "CostUnit" AS ENUM ('KG', 'M', 'UN');

-- CreateEnum
CREATE TYPE "CostLineKind" AS ENUM ('MATERIAL', 'COMPONENTE', 'PROCESSO', 'SERVICO', 'SUBFICHA', 'OUTRO');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "grade" TEXT,
    "diameterMm" DOUBLE PRECISION,
    "wallMm" DOUBLE PRECISION,
    "sizeLabel" TEXT,
    "unit" "CostUnit" NOT NULL DEFAULT 'KG',
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "ncm" TEXT,
    "supplier" TEXT,
    "lastPurchaseAt" TIMESTAMP(3),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rateCentsPerHour" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "rbt12Cents" INTEGER NOT NULL DEFAULT 0,
    "dasOverrideBps" INTEGER,
    "otherTaxBps" INTEGER NOT NULL DEFAULT 0,
    "commissionBps" INTEGER NOT NULL DEFAULT 0,
    "paymentFeeBps" INTEGER NOT NULL DEFAULT 0,
    "fixedExpenseBps" INTEGER NOT NULL DEFAULT 0,
    "marginBps" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostSheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "batchQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ncm" TEXT,
    "notes" TEXT,
    "pricingProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostSheetLine" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "kind" "CostLineKind" NOT NULL,
    "description" TEXT,
    "materialId" TEXT,
    "workCenterId" TEXT,
    "subSheetId" TEXT,
    "lengthMm" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minutes" DOUBLE PRECISION,
    "scrapBps" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER,

    CONSTRAINT "CostSheetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "supplierDoc" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierUf" TEXT,
    "recipientDoc" TEXT,
    "totalCents" INTEGER NOT NULL,
    "xml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cfop" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "ipiCents" INTEGER NOT NULL DEFAULT 0,
    "icmsCents" INTEGER NOT NULL DEFAULT 0,
    "icmsStCents" INTEGER NOT NULL DEFAULT 0,
    "effectiveTotalCents" INTEGER NOT NULL,
    "effectiveUnitCostCents" INTEGER NOT NULL,
    "materialId" TEXT,
    "kgPerUnit" DOUBLE PRECISION,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_kind_active_idx" ON "Material"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_name_key" ON "WorkCenter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostSheet_productId_key" ON "CostSheet"("productId");

-- CreateIndex
CREATE INDEX "CostSheetLine_sheetId_position_idx" ON "CostSheetLine"("sheetId", "position");

-- CreateIndex
CREATE INDEX "CostSheetLine_subSheetId_idx" ON "CostSheetLine"("subSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_accessKey_key" ON "PurchaseInvoice"("accessKey");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_supplierDoc_idx" ON "PurchaseInvoice"("supplierDoc");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_issuedAt_idx" ON "PurchaseInvoice"("issuedAt");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_invoiceId_position_idx" ON "PurchaseInvoiceItem"("invoiceId", "position");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_materialId_idx" ON "PurchaseInvoiceItem"("materialId");

-- AddForeignKey
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheetLine" ADD CONSTRAINT "CostSheetLine_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "CostSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheetLine" ADD CONSTRAINT "CostSheetLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheetLine" ADD CONSTRAINT "CostSheetLine_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheetLine" ADD CONSTRAINT "CostSheetLine_subSheetId_fkey" FOREIGN KEY ("subSheetId") REFERENCES "CostSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

