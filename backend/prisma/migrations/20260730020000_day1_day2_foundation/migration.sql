ALTER TYPE "VerificationPurpose" ADD VALUE 'PASSWORD_RESET';

CREATE TYPE "MediaPurpose" AS ENUM ('AVATAR', 'COVER', 'LOGO', 'PORTFOLIO');
CREATE TYPE "PortfolioStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "AuthToken"
ADD COLUMN "familyId" TEXT,
ADD COLUMN "replacedById" TEXT,
ADD COLUMN "createdByIp" TEXT,
ADD COLUMN "userAgent" TEXT;

UPDATE "AuthToken" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "AuthToken" ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "VerificationCode"
ADD COLUMN "resendAvailableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CreatorProfile"
ADD COLUMN "ratingAverage" DECIMAL(3,2),
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "BusinessProfile"
ADD COLUMN "ratingAverage" DECIMAL(3,2),
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PortfolioItem"
ADD COLUMN "mediaAssetId" TEXT,
ADD COLUMN "status" "PortfolioStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "purpose" "MediaPurpose" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "PortfolioItem_creatorId_createdAt_idx";

CREATE UNIQUE INDEX "AuthToken_replacedById_key" ON "AuthToken"("replacedById");
CREATE INDEX "AuthToken_userId_familyId_idx" ON "AuthToken"("userId", "familyId");

CREATE INDEX "CreatorProfile_channelName_idx" ON "CreatorProfile"("channelName");
CREATE INDEX "CreatorProfile_location_idx" ON "CreatorProfile"("location");
CREATE INDEX "CreatorProfile_startingRate_idx" ON "CreatorProfile"("startingRate");
CREATE INDEX "CreatorProfile_ratingAverage_idx" ON "CreatorProfile"("ratingAverage");
CREATE INDEX "CreatorProfile_categories_idx" ON "CreatorProfile" USING GIN ("categories");

CREATE INDEX "BusinessProfile_companyName_idx" ON "BusinessProfile"("companyName");
CREATE INDEX "BusinessProfile_industry_idx" ON "BusinessProfile"("industry");
CREATE INDEX "BusinessProfile_location_idx" ON "BusinessProfile"("location");
CREATE INDEX "BusinessProfile_ratingAverage_idx" ON "BusinessProfile"("ratingAverage");

CREATE INDEX "PortfolioItem_creatorId_status_sortOrder_idx"
ON "PortfolioItem"("creatorId", "status", "sortOrder");
CREATE INDEX "PortfolioItem_creatorId_deletedAt_createdAt_idx"
ON "PortfolioItem"("creatorId", "deletedAt", "createdAt");

CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_ownerId_purpose_createdAt_idx"
ON "MediaAsset"("ownerId", "purpose", "createdAt");
CREATE INDEX "MediaAsset_deletedAt_idx" ON "MediaAsset"("deletedAt");

ALTER TABLE "AuthToken"
ADD CONSTRAINT "AuthToken_replacedById_fkey"
FOREIGN KEY ("replacedById") REFERENCES "AuthToken"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioItem"
ADD CONSTRAINT "PortfolioItem_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
