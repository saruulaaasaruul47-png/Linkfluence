-- Canonical creator/business social content foundation.
ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'CONTENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_LIKE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_MENTION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DIRECT_MESSAGE';

CREATE TYPE "ContentAuthorType" AS ENUM ('CREATOR', 'BUSINESS');
CREATE TYPE "ContentPostType" AS ENUM ('ORIGINAL', 'PORTFOLIO', 'CAMPAIGN', 'COLLABORATION', 'BRAND_STORY');
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS');
CREATE TYPE "ContentPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REMOVED');
CREATE TYPE "ContentReactionType" AS ENUM ('LIKE');

CREATE TABLE "ContentPost" (
  "id" TEXT NOT NULL,
  "authorType" "ContentAuthorType" NOT NULL,
  "creatorId" TEXT,
  "businessId" TEXT,
  "postType" "ContentPostType" NOT NULL DEFAULT 'ORIGINAL',
  "title" TEXT,
  "caption" TEXT NOT NULL,
  "category" TEXT,
  "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
  "status" "ContentPostStatus" NOT NULL DEFAULT 'DRAFT',
  "campaignId" TEXT,
  "portfolioItemId" TEXT,
  "collaborationId" TEXT,
  "paidPartnership" BOOLEAN NOT NULL DEFAULT false,
  "partnerCreatorId" TEXT,
  "partnerBusinessId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentPost_exactly_one_author_check" CHECK (
    ("authorType" = 'CREATOR' AND "creatorId" IS NOT NULL AND "businessId" IS NULL)
    OR ("authorType" = 'BUSINESS' AND "businessId" IS NOT NULL AND "creatorId" IS NULL)
  )
);

CREATE TABLE "ContentMedia" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "thumbnailAssetId" TEXT,
  "mediaType" "MediaType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "altText" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "type" "ContentReactionType" NOT NULL DEFAULT 'LIKE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "targetType" "ContentAuthorType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChannelMute" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetType" "ContentAuthorType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelMute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentPost_status_visibility_publishedAt_id_idx" ON "ContentPost"("status", "visibility", "publishedAt", "id");
CREATE INDEX "ContentPost_category_status_publishedAt_idx" ON "ContentPost"("category", "status", "publishedAt");
CREATE INDEX "ContentPost_creatorId_status_createdAt_idx" ON "ContentPost"("creatorId", "status", "createdAt");
CREATE INDEX "ContentPost_businessId_status_createdAt_idx" ON "ContentPost"("businessId", "status", "createdAt");
CREATE INDEX "ContentPost_campaignId_idx" ON "ContentPost"("campaignId");
CREATE INDEX "ContentPost_collaborationId_idx" ON "ContentPost"("collaborationId");
CREATE UNIQUE INDEX "ContentMedia_postId_mediaAssetId_key" ON "ContentMedia"("postId", "mediaAssetId");
CREATE INDEX "ContentMedia_postId_sortOrder_idx" ON "ContentMedia"("postId", "sortOrder");
CREATE INDEX "ContentMedia_mediaAssetId_idx" ON "ContentMedia"("mediaAssetId");
CREATE UNIQUE INDEX "ContentReaction_userId_postId_type_key" ON "ContentReaction"("userId", "postId", "type");
CREATE INDEX "ContentReaction_postId_type_createdAt_idx" ON "ContentReaction"("postId", "type", "createdAt");
CREATE UNIQUE INDEX "UserBlock_blockerId_targetType_targetId_key" ON "UserBlock"("blockerId", "targetType", "targetId");
CREATE INDEX "UserBlock_targetType_targetId_createdAt_idx" ON "UserBlock"("targetType", "targetId", "createdAt");
CREATE UNIQUE INDEX "ChannelMute_userId_targetType_targetId_key" ON "ChannelMute"("userId", "targetType", "targetId");
CREATE INDEX "ChannelMute_targetType_targetId_createdAt_idx" ON "ChannelMute"("targetType", "targetId", "createdAt");

ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_partnerCreatorId_fkey" FOREIGN KEY ("partnerCreatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_partnerBusinessId_fkey" FOREIGN KEY ("partnerBusinessId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_portfolioItemId_fkey" FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentMedia" ADD CONSTRAINT "ContentMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentMedia" ADD CONSTRAINT "ContentMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentMedia" ADD CONSTRAINT "ContentMedia_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentReaction" ADD CONSTRAINT "ContentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReaction" ADD CONSTRAINT "ContentReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelMute" ADD CONSTRAINT "ChannelMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
