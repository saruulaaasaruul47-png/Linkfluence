CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "CreatorProfile_channelName_trgm_idx"
  ON "CreatorProfile" USING GIN (lower("channelName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CreatorProfile_slug_trgm_idx"
  ON "CreatorProfile" USING GIN (lower("slug") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CreatorProfile_bio_trgm_idx"
  ON "CreatorProfile" USING GIN (lower(coalesce("bio", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CreatorProfile_location_trgm_idx"
  ON "CreatorProfile" USING GIN (lower(coalesce("location", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "BusinessProfile_companyName_trgm_idx"
  ON "BusinessProfile" USING GIN (lower("companyName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BusinessProfile_slug_trgm_idx"
  ON "BusinessProfile" USING GIN (lower("slug") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BusinessProfile_description_trgm_idx"
  ON "BusinessProfile" USING GIN (lower(coalesce("description", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BusinessProfile_industry_trgm_idx"
  ON "BusinessProfile" USING GIN (lower(coalesce("industry", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Campaign_title_trgm_idx"
  ON "Campaign" USING GIN (lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Campaign_description_trgm_idx"
  ON "Campaign" USING GIN (lower(coalesce("description", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ContentPost_caption_trgm_idx"
  ON "ContentPost" USING GIN (lower("caption") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ShowcasePost_title_trgm_idx"
  ON "ShowcasePost" USING GIN (lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ShowcasePost_description_trgm_idx"
  ON "ShowcasePost" USING GIN (lower(coalesce("description", '')) gin_trgm_ops);
