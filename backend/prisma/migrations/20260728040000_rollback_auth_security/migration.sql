-- Remove any one-time reset grants before narrowing the enum.
DELETE FROM "AuthToken" WHERE "type"::text = 'PASSWORD_RESET_GRANT';

-- Recreate AuthTokenType without the value introduced by auth_security.
ALTER TABLE "AuthToken" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
DROP TYPE "AuthTokenType";
CREATE TYPE "AuthTokenType" AS ENUM ('REFRESH', 'EMAIL_VERIFICATION', 'PASSWORD_RESET');
ALTER TABLE "AuthToken" ALTER COLUMN "type" TYPE "AuthTokenType" USING "type"::"AuthTokenType";

-- Remove fields introduced only for the reverted auth implementation.
ALTER TABLE "AuthToken"
  DROP COLUMN "attempts",
  DROP COLUMN "lastSentAt",
  DROP COLUMN "metadata";

ALTER TABLE "User"
  DROP COLUMN "failedLoginAttempts",
  DROP COLUMN "lockedUntil";
