-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('REQUESTED', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "RecordReport" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'READY',
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordReport_recordId_idx" ON "RecordReport"("recordId");

-- CreateIndex
CREATE INDEX "RecordReport_userId_idx" ON "RecordReport"("userId");
