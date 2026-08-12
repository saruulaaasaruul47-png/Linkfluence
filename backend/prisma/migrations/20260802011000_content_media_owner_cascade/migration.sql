-- Account deletion removes owned media and its post-media join rows safely.
ALTER TABLE "ContentMedia" DROP CONSTRAINT "ContentMedia_mediaAssetId_fkey";
ALTER TABLE "ContentMedia" ADD CONSTRAINT "ContentMedia_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
