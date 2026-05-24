-- CreateEnum
CREATE TYPE "CreditPackageName" AS ENUM ('BASIC', 'MEDIUM', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "name" "CreditPackageName" NOT NULL,
    "credits" INTEGER NOT NULL,
    "pricePerCreditInCents" INTEGER NOT NULL,
    "benefits" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "packageName" "CreditPackageName" NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "payerEmail" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCreditBalance" (
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCreditBalance_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_name_key" ON "CreditPackage"("name");

-- CreateIndex
CREATE INDEX "CreditPurchase_userId_idx" ON "CreditPurchase"("userId");

-- CreateIndex
CREATE INDEX "CreditPurchase_packageName_idx" ON "CreditPurchase"("packageName");

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
