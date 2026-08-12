-- Extend verified social connections from creator-only profiles to both local channel types.
CREATE TYPE "SocialChannelType" AS ENUM ('CREATOR', 'BUSINESS');

ALTER TYPE "SocialSyncStatus" ADD VALUE 'DISCONNECTED';

ALTER TABLE "SocialAccount"
  ALTER COLUMN "creatorId" DROP NOT NULL,
  ADD COLUMN "businessId" TEXT;

ALTER TABLE "SocialOAuthState"
  ADD COLUMN "channelType" "SocialChannelType" NOT NULL DEFAULT 'CREATOR',
  ADD COLUMN "selectionTokenHash" TEXT,
  ADD COLUMN "accessTokenEncrypted" TEXT,
  ADD COLUMN "refreshTokenEncrypted" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "candidates" JSONB;

CREATE TABLE "SocialMediaItem" (
  "id" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "externalMediaId" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "caption" TEXT,
  "permalink" TEXT,
  "thumbnailUrl" TEXT,
  "mediaUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialMediaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialMediaStatSnapshot" (
  "id" TEXT NOT NULL,
  "mediaItemId" TEXT NOT NULL,
  "likeCount" INTEGER,
  "commentCount" INTEGER,
  "savedCount" INTEGER,
  "shareCount" INTEGER,
  "reach" INTEGER,
  "impressions" INTEGER,
  "plays" INTEGER,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialMediaStatSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "objectType" TEXT,
  "entryCount" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "SocialWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAccount_businessId_platform_key" ON "SocialAccount"("businessId", "platform");
CREATE INDEX "SocialAccount_businessId_platform_idx" ON "SocialAccount"("businessId", "platform");
CREATE UNIQUE INDEX "SocialOAuthState_selectionTokenHash_key" ON "SocialOAuthState"("selectionTokenHash");
CREATE INDEX "SocialOAuthState_selectionTokenHash_expiresAt_idx" ON "SocialOAuthState"("selectionTokenHash", "expiresAt");
CREATE UNIQUE INDEX "SocialMediaItem_socialAccountId_externalMediaId_key" ON "SocialMediaItem"("socialAccountId", "externalMediaId");
CREATE INDEX "SocialMediaItem_socialAccountId_publishedAt_idx" ON "SocialMediaItem"("socialAccountId", "publishedAt" DESC);
CREATE INDEX "SocialMediaStatSnapshot_mediaItemId_capturedAt_idx" ON "SocialMediaStatSnapshot"("mediaItemId", "capturedAt" DESC);
CREATE UNIQUE INDEX "SocialWebhookEvent_eventHash_key" ON "SocialWebhookEvent"("eventHash");
CREATE INDEX "SocialWebhookEvent_provider_receivedAt_idx" ON "SocialWebhookEvent"("provider", "receivedAt" DESC);

ALTER TABLE "SocialAccount"
  ADD CONSTRAINT "SocialAccount_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialMediaItem"
  ADD CONSTRAINT "SocialMediaItem_socialAccountId_fkey"
  FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialMediaStatSnapshot"
  ADD CONSTRAINT "SocialMediaStatSnapshot_mediaItemId_fkey"
  FOREIGN KEY ("mediaItemId") REFERENCES "SocialMediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialAccount"
  ADD CONSTRAINT "SocialAccount_exactly_one_owner_check"
  CHECK (("creatorId" IS NOT NULL AND "businessId" IS NULL) OR ("creatorId" IS NULL AND "businessId" IS NOT NULL));
