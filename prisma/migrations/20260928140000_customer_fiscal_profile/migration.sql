-- CreateEnum
CREATE TYPE "IeIndicator" AS ENUM ('CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE');

-- CreateEnum
CREATE TYPE "AddressKind" AS ENUM ('PRINCIPAL', 'ENTREGA');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ieIndicator" "IeIndicator",
ADD COLUMN     "stateRegistration" TEXT,
ADD COLUMN     "tradeName" TEXT;

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "AddressKind" NOT NULL DEFAULT 'PRINCIPAL',
    "postalCode" CHAR(8),
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "municipalityCode" CHAR(7),
    "cityName" TEXT,
    "state" CHAR(2),
    "countryCode" CHAR(2) NOT NULL DEFAULT 'BR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAddress_municipalityCode_idx" ON "CustomerAddress"("municipalityCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAddress_customerId_kind_key" ON "CustomerAddress"("customerId", "kind");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_municipalityCode_fkey" FOREIGN KEY ("municipalityCode") REFERENCES "Municipality"("ibgeCode") ON DELETE SET NULL ON UPDATE CASCADE;

