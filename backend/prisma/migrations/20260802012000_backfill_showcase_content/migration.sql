-- Keep the existing completed-work showcase visible after the frontend switches
-- to the canonical content feed. Portfolio-owned media is reused where possible;
-- legacy external URLs receive a migration-only MediaAsset record.
INSERT INTO "MediaAsset" (
  "id", "ownerId", "purpose", "storageKey", "url", "originalName",
  "mimeType", "sizeBytes", "checksum", "createdAt"
)
SELECT
  'legacy_asset_' || sp."id",
  cp."userId",
  'CONTENT',
  'legacy-showcase/' || sp."id",
  sp."mediaUrl",
  'legacy-showcase-' || sp."id",
  CASE WHEN sp."mediaType" = 'VIDEO' THEN 'video/mp4' ELSE 'image/jpeg' END,
  0,
  'legacy:' || sp."id",
  sp."createdAt"
FROM "ShowcasePost" sp
JOIN "CreatorProfile" cp ON cp."id" = sp."creatorId"
LEFT JOIN "PortfolioItem" pi ON pi."id" = sp."portfolioItemId"
WHERE pi."mediaAssetId" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "ContentPost" (
  "id", "authorType", "creatorId", "postType", "title", "caption",
  "category", "visibility", "status", "portfolioItemId", "collaborationId",
  "publishedAt", "archivedAt", "createdAt", "updatedAt"
)
SELECT
  'legacy_' || sp."id",
  'CREATOR',
  sp."creatorId",
  CASE WHEN sp."collaborationId" IS NOT NULL THEN 'COLLABORATION'::"ContentPostType" ELSE 'PORTFOLIO'::"ContentPostType" END,
  sp."title",
  COALESCE(NULLIF(sp."description", ''), sp."title"),
  sp."category",
  'PUBLIC',
  sp."status"::text::"ContentPostStatus",
  sp."portfolioItemId",
  sp."collaborationId",
  sp."publishedAt",
  sp."archivedAt",
  sp."createdAt",
  sp."updatedAt"
FROM "ShowcasePost" sp
ON CONFLICT DO NOTHING;

INSERT INTO "ContentMedia" (
  "id", "postId", "mediaAssetId", "mediaType", "sortOrder", "altText", "createdAt"
)
SELECT
  'legacy_media_' || sp."id",
  'legacy_' || sp."id",
  COALESCE(pi."mediaAssetId", 'legacy_asset_' || sp."id"),
  sp."mediaType",
  0,
  sp."title",
  sp."createdAt"
FROM "ShowcasePost" sp
LEFT JOIN "PortfolioItem" pi ON pi."id" = sp."portfolioItemId"
ON CONFLICT DO NOTHING;

INSERT INTO "ContentReaction" ("id", "userId", "postId", "type", "createdAt")
SELECT 'legacy_reaction_' || sr."id", sr."userId", 'legacy_' || sr."showcaseId", 'LIKE', sr."createdAt"
FROM "ShowcaseReaction" sr
ON CONFLICT DO NOTHING;

INSERT INTO "SavedItem" ("id", "userId", "targetType", "targetId", "createdAt")
SELECT 'legacy_saved_' || si."id", si."userId", 'CONTENT', 'legacy_' || si."targetId", si."createdAt"
FROM "SavedItem" si
WHERE si."targetType" = 'SHOWCASE'
ON CONFLICT DO NOTHING;
