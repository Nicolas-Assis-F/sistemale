-- CreateTable
CREATE TABLE "Municipality" (
    "ibgeCode" CHAR(7) NOT NULL,
    "name" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "searchName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("ibgeCode")
);

-- CreateIndex
CREATE INDEX "Municipality_state_searchName_idx" ON "Municipality"("state", "searchName");

