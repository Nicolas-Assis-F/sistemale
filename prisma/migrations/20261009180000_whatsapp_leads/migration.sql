-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('QUENTE', 'MORNO', 'FRIO');

-- CreateEnum
CREATE TYPE "LeadDispatchStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'RESPONDEU', 'PULADO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "savedName" TEXT,
    "pushName" TEXT,
    "suggestedName" TEXT,
    "kind" TEXT,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "temperature" "LeadTemperature",
    "stage" TEXT,
    "segments" TEXT[],
    "equipment" TEXT,
    "interests" TEXT[],
    "objections" TEXT,
    "summary" TEXT,
    "nextStep" TEXT,
    "pendingOrder" TEXT,
    "balanceNote" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPurchase" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "qty" TEXT,
    "amountCents" INTEGER,
    "date" TIMESTAMP(3),
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadReceivable" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "filter" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadDispatch" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "message" TEXT NOT NULL,
    "status" "LeadDispatchStatus" NOT NULL DEFAULT 'PENDENTE',
    "sentAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_temperature_idx" ON "Lead"("temperature");

-- CreateIndex
CREATE INDEX "Lead_isCustomer_idx" ON "Lead"("isCustomer");

-- CreateIndex
CREATE INDEX "Lead_lastInboundAt_idx" ON "Lead"("lastInboundAt");

-- CreateIndex
CREATE INDEX "LeadPurchase_leadId_date_idx" ON "LeadPurchase"("leadId", "date");

-- CreateIndex
CREATE INDEX "LeadReceivable_leadId_idx" ON "LeadReceivable"("leadId");

-- CreateIndex
CREATE INDEX "LeadReceivable_paidAt_dueDate_idx" ON "LeadReceivable"("paidAt", "dueDate");

-- CreateIndex
CREATE INDEX "LeadDispatch_status_idx" ON "LeadDispatch"("status");

-- CreateIndex
CREATE INDEX "LeadDispatch_leadId_createdAt_idx" ON "LeadDispatch"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDispatch_campaignId_leadId_key" ON "LeadDispatch"("campaignId", "leadId");

-- AddForeignKey
ALTER TABLE "LeadPurchase" ADD CONSTRAINT "LeadPurchase_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadReceivable" ADD CONSTRAINT "LeadReceivable_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDispatch" ADD CONSTRAINT "LeadDispatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDispatch" ADD CONSTRAINT "LeadDispatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

