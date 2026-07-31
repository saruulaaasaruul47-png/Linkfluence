-- Day 3: persistent library, showcase and polymorphic channel follows.
-- Day 4: campaign workflow, proposals, sourcing lists and invitations.

CREATE TYPE "ShowcaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ShowcaseReactionType" AS ENUM ('LIKE');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

ALTER TYPE "CampaignStatus" ADD VALUE 'ARCHIVED';
ALTER TYPE "LibraryTargetType" ADD VALUE 'CONTENT';

ALTER TABLE "Follow" DROP CONSTRAINT "Follow_targetId_fkey";
DROP INDEX "Follow_followerId_targetId_key";
DROP INDEX "Follow_targetId_createdAt_idx";

ALTER TABLE "Campaign"
  ADD COLUMN "applicationDeadline" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "deliverables" JSONB,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Existing Follow.targetId values pointed at User records. Preserve their
-- creator/business intent before enforcing the new polymorphic target column.
ALTER TABLE "Follow" ADD COLUMN "targetType" "LibraryTargetType";
UPDATE "Follow" AS follow
SET "targetType" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "BusinessProfile" AS business
    WHERE business."userId" = follow."targetId"
  ) THEN 'BUSINESS'::"LibraryTargetType"
  ELSE 'CREATOR'::"LibraryTargetType"
END;
UPDATE "Follow" AS follow
SET "targetId" = COALESCE(
  (SELECT creator."id" FROM "CreatorProfile" AS creator WHERE creator."userId" = follow."targetId"),
  (SELECT business."id" FROM "BusinessProfile" AS business WHERE business."userId" = follow."targetId"),
  follow."targetId"
);
ALTER TABLE "Follow" ALTER COLUMN "targetType" SET NOT NULL;

ALTER TABLE "Proposal" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "SavedItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetType" "LibraryTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecentView" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetType" "LibraryTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecentView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShareEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "targetType" "LibraryTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "channel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowcasePost" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "portfolioItemId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "mediaType" "MediaType" NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "status" "ShowcaseStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShowcasePost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowcaseReaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "showcaseId" TEXT NOT NULL,
  "type" "ShowcaseReactionType" NOT NULL DEFAULT 'LIKE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowcaseReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorShortlist" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "campaignId" TEXT,
  "contextKey" TEXT NOT NULL DEFAULT 'general',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorShortlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorComparison" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "campaignId" TEXT,
  "contextKey" TEXT NOT NULL DEFAULT 'general',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorComparison_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignInvitation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "message" TEXT,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignInvitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedItem_userId_createdAt_idx" ON "SavedItem"("userId", "createdAt");
CREATE INDEX "SavedItem_targetType_targetId_idx" ON "SavedItem"("targetType", "targetId");
CREATE UNIQUE INDEX "SavedItem_userId_targetType_targetId_key" ON "SavedItem"("userId", "targetType", "targetId");
CREATE INDEX "RecentView_userId_viewedAt_idx" ON "RecentView"("userId", "viewedAt");
CREATE UNIQUE INDEX "RecentView_userId_targetType_targetId_key" ON "RecentView"("userId", "targetType", "targetId");
CREATE INDEX "ShareEvent_targetType_targetId_createdAt_idx" ON "ShareEvent"("targetType", "targetId", "createdAt");
CREATE INDEX "ShareEvent_userId_createdAt_idx" ON "ShareEvent"("userId", "createdAt");
CREATE INDEX "ShowcasePost_status_publishedAt_idx" ON "ShowcasePost"("status", "publishedAt");
CREATE INDEX "ShowcasePost_creatorId_status_createdAt_idx" ON "ShowcasePost"("creatorId", "status", "createdAt");
CREATE INDEX "ShowcasePost_category_status_idx" ON "ShowcasePost"("category", "status");
CREATE INDEX "ShowcaseReaction_showcaseId_type_createdAt_idx" ON "ShowcaseReaction"("showcaseId", "type", "createdAt");
CREATE UNIQUE INDEX "ShowcaseReaction_userId_showcaseId_type_key" ON "ShowcaseReaction"("userId", "showcaseId", "type");
CREATE INDEX "CreatorShortlist_businessId_campaignId_createdAt_idx" ON "CreatorShortlist"("businessId", "campaignId", "createdAt");
CREATE INDEX "CreatorShortlist_creatorId_createdAt_idx" ON "CreatorShortlist"("creatorId", "createdAt");
CREATE UNIQUE INDEX "CreatorShortlist_businessId_creatorId_contextKey_key" ON "CreatorShortlist"("businessId", "creatorId", "contextKey");
CREATE INDEX "CreatorComparison_businessId_campaignId_createdAt_idx" ON "CreatorComparison"("businessId", "campaignId", "createdAt");
CREATE UNIQUE INDEX "CreatorComparison_businessId_creatorId_contextKey_key" ON "CreatorComparison"("businessId", "creatorId", "contextKey");
CREATE INDEX "CampaignInvitation_creatorId_status_createdAt_idx" ON "CampaignInvitation"("creatorId", "status", "createdAt");
CREATE INDEX "CampaignInvitation_businessId_status_createdAt_idx" ON "CampaignInvitation"("businessId", "status", "createdAt");
CREATE UNIQUE INDEX "CampaignInvitation_campaignId_creatorId_key" ON "CampaignInvitation"("campaignId", "creatorId");
CREATE INDEX "Follow_targetType_targetId_createdAt_idx" ON "Follow"("targetType", "targetId", "createdAt");
CREATE UNIQUE INDEX "Follow_followerId_targetType_targetId_key" ON "Follow"("followerId", "targetType", "targetId");

ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentView" ADD CONSTRAINT "RecentView_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShowcasePost" ADD CONSTRAINT "ShowcasePost_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcasePost" ADD CONSTRAINT "ShowcasePost_portfolioItemId_fkey"
  FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShowcaseReaction" ADD CONSTRAINT "ShowcaseReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseReaction" ADD CONSTRAINT "ShowcaseReaction_showcaseId_fkey"
  FOREIGN KEY ("showcaseId") REFERENCES "ShowcasePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorShortlist" ADD CONSTRAINT "CreatorShortlist_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorShortlist" ADD CONSTRAINT "CreatorShortlist_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorShortlist" ADD CONSTRAINT "CreatorShortlist_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorComparison" ADD CONSTRAINT "CreatorComparison_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorComparison" ADD CONSTRAINT "CreatorComparison_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorComparison" ADD CONSTRAINT "CreatorComparison_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
