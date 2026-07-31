-- Authentication accounts start pending until their email is verified.
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
UPDATE "User" SET "status" = 'SUSPENDED' WHERE "status" = 'RESTRICTED';
UPDATE "User" SET "status" = 'BANNED' WHERE "status" = 'DELETED';
DROP TYPE "AccountStatus";
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED');
ALTER TABLE "User"
  ALTER COLUMN "status" TYPE "AccountStatus" USING "status"::"AccountStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

-- Refresh tokens use their own rotation identifier and no longer share OTP types.
DROP INDEX IF EXISTS "AuthToken_userId_type_idx";
ALTER TABLE "AuthToken"
  ADD COLUMN "jti" TEXT,
  DROP COLUMN "type",
  DROP COLUMN "usedAt";
UPDATE "AuthToken" SET "jti" = "id" WHERE "jti" IS NULL;
ALTER TABLE "AuthToken" ALTER COLUMN "jti" SET NOT NULL;
CREATE UNIQUE INDEX "AuthToken_jti_key" ON "AuthToken"("jti");
CREATE INDEX "AuthToken_userId_idx" ON "AuthToken"("userId");
CREATE INDEX "AuthToken_userId_revokedAt_idx" ON "AuthToken"("userId", "revokedAt");

-- OTP records are isolated from refresh-token records.
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION');
CREATE TABLE "VerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL DEFAULT 'EMAIL_VERIFICATION',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationCode_userId_purpose_idx" ON "VerificationCode"("userId", "purpose");
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");
ALTER TABLE "VerificationCode"
  ADD CONSTRAINT "VerificationCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
