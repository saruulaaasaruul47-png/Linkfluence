INSERT INTO "BusinessMember" (
  "id", "businessId", "userId", "role", "status", "joinedAt", "createdAt", "updatedAt"
)
SELECT
  'bm_' || md5(bp."id" || ':' || bp."userId"),
  bp."id",
  bp."userId",
  'OWNER'::"BusinessMemberRole",
  'ACTIVE'::"BusinessMemberStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "BusinessProfile" bp
WHERE NOT EXISTS (
  SELECT 1
  FROM "BusinessMember" bm
  WHERE bm."businessId" = bp."id" AND bm."userId" = bp."userId"
);
