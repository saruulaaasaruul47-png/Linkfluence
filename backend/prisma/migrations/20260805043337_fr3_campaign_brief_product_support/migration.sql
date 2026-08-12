-- CreateEnum
CREATE TYPE "CampaignAttachmentKind" AS ENUM ('BRIEF', 'BRAND_GUIDELINE', 'REFERENCE');

-- AlterEnum
ALTER TYPE "MediaPurpose" ADD VALUE 'CAMPAIGN_BRIEF';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "productSupport" JSONB;

-- CreateTable
CREATE TABLE "CampaignAttachment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "kind" "CampaignAttachmentKind" NOT NULL DEFAULT 'BRIEF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignAttachment_campaignId_createdAt_idx" ON "CampaignAttachment"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignAttachment_mediaAssetId_idx" ON "CampaignAttachment"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
