-- Story audio metadata is stored separately from the visual ContentMedia list so
-- an audio track can be permissioned and delivered through the existing MediaAsset API.
ALTER TABLE "ContentPost"
ADD COLUMN "audioAssetId" TEXT,
ADD COLUMN "audioTitle" TEXT,
ADD COLUMN "audioArtist" TEXT,
ADD COLUMN "audioStartMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "audioVolume" DECIMAL(4,3),
ADD COLUMN "audioRightsConfirmedAt" TIMESTAMP(3);

CREATE INDEX "ContentPost_audioAssetId_idx" ON "ContentPost"("audioAssetId");

ALTER TABLE "ContentPost"
ADD CONSTRAINT "ContentPost_audioAssetId_fkey"
FOREIGN KEY ("audioAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "LiveStreamStatus" AS ENUM ('LIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "LiveStream" (
  "id" TEXT NOT NULL,
  "hostUserId" TEXT NOT NULL,
  "authorType" "ContentAuthorType" NOT NULL,
  "creatorId" TEXT,
  "businessId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
  "status" "LiveStreamStatus" NOT NULL DEFAULT 'LIVE',
  "activeKey" TEXT,
  "peakViewerCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveStream_activeKey_key" ON "LiveStream"("activeKey");
CREATE INDEX "LiveStream_status_visibility_startedAt_idx" ON "LiveStream"("status", "visibility", "startedAt");
CREATE INDEX "LiveStream_creatorId_status_idx" ON "LiveStream"("creatorId", "status");
CREATE INDEX "LiveStream_businessId_status_idx" ON "LiveStream"("businessId", "status");
CREATE INDEX "LiveStream_expiresAt_idx" ON "LiveStream"("expiresAt");

ALTER TABLE "LiveStream"
ADD CONSTRAINT "LiveStream_hostUserId_fkey"
FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveStream"
ADD CONSTRAINT "LiveStream_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveStream"
ADD CONSTRAINT "LiveStream_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
