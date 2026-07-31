ALTER TABLE "Deliverable" ADD COLUMN "mediaAssetId" TEXT;

CREATE INDEX "Deliverable_mediaAssetId_idx" ON "Deliverable"("mediaAssetId");

ALTER TABLE "Deliverable"
  ADD CONSTRAINT "Deliverable_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
