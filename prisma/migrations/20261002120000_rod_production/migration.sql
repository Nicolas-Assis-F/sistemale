-- CreateEnum
CREATE TYPE "ProductionItemKind" AS ENUM ('TUBO', 'PECA', 'PAR');

-- CreateEnum
CREATE TYPE "ProductionMoveReason" AS ENUM ('ENTRADA', 'CORTE', 'SOLDA', 'REFUGO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "RodStatus" AS ENUM ('INSPECAO', 'RETRABALHO', 'APROVADA', 'REFUGO');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "markLetter" TEXT,
ADD COLUMN     "pieceRateCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductionMove" (
    "id" TEXT NOT NULL,
    "kind" "ProductionItemKind" NOT NULL,
    "diameter" TEXT NOT NULL,
    "lengthM" INTEGER NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL,
    "reason" "ProductionMoveReason" NOT NULL,
    "note" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rod" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "markCode" TEXT NOT NULL,
    "diameter" TEXT NOT NULL,
    "lengthM" INTEGER NOT NULL,
    "status" "RodStatus" NOT NULL DEFAULT 'INSPECAO',
    "welderId" TEXT NOT NULL,
    "helperId" TEXT,
    "productId" TEXT,
    "measuredMm" INTEGER,
    "defect" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "welderPayoutId" TEXT,
    "helperPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPayout" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "welded" INTEGER NOT NULL,
    "helped" INTEGER NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "financeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionMove_kind_diameter_lengthM_idx" ON "ProductionMove"("kind", "diameter", "lengthM");

-- CreateIndex
CREATE INDEX "ProductionMove_createdAt_idx" ON "ProductionMove"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Rod_serial_key" ON "Rod"("serial");

-- CreateIndex
CREATE INDEX "Rod_status_idx" ON "Rod"("status");

-- CreateIndex
CREATE INDEX "Rod_markCode_idx" ON "Rod"("markCode");

-- CreateIndex
CREATE INDEX "Rod_approvedAt_idx" ON "Rod"("approvedAt");

-- CreateIndex
CREATE INDEX "Rod_welderId_welderPayoutId_idx" ON "Rod"("welderId", "welderPayoutId");

-- CreateIndex
CREATE INDEX "Rod_helperId_helperPayoutId_idx" ON "Rod"("helperId", "helperPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPayout_financeEntryId_key" ON "ProductionPayout"("financeEntryId");

-- CreateIndex
CREATE INDEX "ProductionPayout_employeeId_createdAt_idx" ON "ProductionPayout"("employeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductionMove" ADD CONSTRAINT "ProductionMove_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rod" ADD CONSTRAINT "Rod_welderId_fkey" FOREIGN KEY ("welderId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rod" ADD CONSTRAINT "Rod_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rod" ADD CONSTRAINT "Rod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rod" ADD CONSTRAINT "Rod_welderPayoutId_fkey" FOREIGN KEY ("welderPayoutId") REFERENCES "ProductionPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rod" ADD CONSTRAINT "Rod_helperPayoutId_fkey" FOREIGN KEY ("helperPayoutId") REFERENCES "ProductionPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPayout" ADD CONSTRAINT "ProductionPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPayout" ADD CONSTRAINT "ProductionPayout_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

