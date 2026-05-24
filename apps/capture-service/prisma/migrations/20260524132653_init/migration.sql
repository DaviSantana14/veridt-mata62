-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "ContentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'STARTED',
    "details" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ContentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureAsset" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentRecord_userId_idx" ON "ContentRecord"("userId");

-- CreateIndex
CREATE INDEX "ContentRecord_status_idx" ON "ContentRecord"("status");

-- CreateIndex
CREATE INDEX "CaptureAsset_recordId_idx" ON "CaptureAsset"("recordId");

-- AddForeignKey
ALTER TABLE "CaptureAsset" ADD CONSTRAINT "CaptureAsset_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ContentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
