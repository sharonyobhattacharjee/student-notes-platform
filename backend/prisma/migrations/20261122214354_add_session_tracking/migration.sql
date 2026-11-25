-- AlterEnum
ALTER TYPE "AuthTokenPurpose" ADD VALUE 'SESSION';

-- AlterTable
ALTER TABLE "AuthToken" ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_lastActivityAt_idx" ON "AuthToken"("userId", "purpose", "lastActivityAt");
