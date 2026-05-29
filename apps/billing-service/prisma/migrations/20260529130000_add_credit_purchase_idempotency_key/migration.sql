-- AlterTable
ALTER TABLE "CreditPurchase" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_idempotencyKey_key" ON "CreditPurchase"("idempotencyKey");
