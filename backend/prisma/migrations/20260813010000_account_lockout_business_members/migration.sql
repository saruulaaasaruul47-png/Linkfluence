ALTER TABLE "User"
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3);

CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'ADMIN', 'CAMPAIGN_MANAGER', 'FINANCE', 'MEMBER');
CREATE TYPE "BusinessMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "BusinessMember" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "BusinessMemberRole" NOT NULL DEFAULT 'MEMBER',
  "status" "BusinessMemberStatus" NOT NULL DEFAULT 'INVITED',
  "invitedBy" TEXT,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");
CREATE INDEX "BusinessMember_userId_status_idx" ON "BusinessMember"("userId", "status");
CREATE INDEX "BusinessMember_businessId_role_status_idx" ON "BusinessMember"("businessId", "role", "status");
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
