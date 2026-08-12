-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "publishReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN     "collaborationId" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_collaborationId_key" ON "PortfolioItem"("collaborationId");

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
