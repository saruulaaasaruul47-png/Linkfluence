-- User-owned account profile fields.
ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "bio" TEXT;

-- Creator channel fields used by onboarding, account and settings screens.
ALTER TABLE "CreatorProfile"
  ADD COLUMN "channelName" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "audienceDescription" TEXT,
  ADD COLUMN "contentFormat" TEXT,
  ADD COLUMN "rates" JSONB,
  ADD COLUMN "publicRates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "availability" TEXT,
  ADD COLUMN "metadata" JSONB;

UPDATE "CreatorProfile" AS creator
SET
  "channelName" = COALESCE(
    (SELECT "displayName" FROM "User" WHERE "User"."id" = creator."userId"),
    'Creator'
  ),
  "slug" = 'creator-' || creator."id"
WHERE "channelName" IS NULL OR "slug" IS NULL;

ALTER TABLE "CreatorProfile"
  ALTER COLUMN "channelName" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "CreatorProfile_slug_key" ON "CreatorProfile"("slug");

-- Business fields already present in the frontend forms.
ALTER TABLE "BusinessProfile"
  ADD COLUMN "companySize" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "preferences" JSONB;
