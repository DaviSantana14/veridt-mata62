-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO');

-- AlterTable
ALTER TABLE "CreditPurchase" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "CreditPurchase" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MERCADO_PAGO',
ADD COLUMN "providerPreferenceId" TEXT,
ADD COLUMN "providerPaymentId" TEXT,
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "canceledAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_providerPreferenceId_key" ON "CreditPurchase"("providerPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_providerPaymentId_key" ON "CreditPurchase"("providerPaymentId");

-- CreateIndex
CREATE INDEX "CreditPurchase_status_idx" ON "CreditPurchase"("status");
