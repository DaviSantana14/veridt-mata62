-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'PENDING';
ALTER TYPE "NotificationStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "providerMessageId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
