ALTER TYPE "ContentPostType" ADD VALUE IF NOT EXISTS 'STORY';

ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ContentPost_postType_status_expiresAt_idx"
  ON "ContentPost"("postType", "status", "expiresAt");
