-- Requirement Day 1: explicit collaboration lifecycle and finance/proof foundations.
ALTER TYPE "CollaborationStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "CollaborationStatus" ADD VALUE IF NOT EXISTS 'PROVEN';
ALTER TYPE "CollaborationStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "CollaborationStatus" ADD VALUE IF NOT EXISTS 'SETTLEMENT_PENDING';

CREATE TYPE "SocialSyncStatus" AS ENUM ('MANUAL', 'CONNECTED', 'SYNCING', 'HEALTHY', 'STALE', 'ERROR', 'REAUTH_REQUIRED');
CREATE TYPE "PublishProofStatus" AS ENUM ('SUBMITTED', 'VERIFYING', 'VERIFIED', 'RETENTION_PENDING', 'RETENTION_PASSED', 'REJECTED', 'REMOVED');
CREATE TYPE "ShowcaseConsentDecision" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
CREATE TYPE "LedgerAccountType" AS ENUM ('PROVIDER_CLEARING', 'ESCROW_LIABILITY', 'CREATOR_PAYABLE', 'PLATFORM_REVENUE', 'REFUND_PAYABLE', 'USER_WALLET');
CREATE TYPE "LedgerEntryType" AS ENUM ('ESCROW_FUNDED', 'CREATOR_EARNED', 'COMMISSION_EARNED', 'PAYOUT_SENT', 'REFUND_ISSUED', 'DISPUTE_ADJUSTMENT', 'RECONCILIATION_ADJUSTMENT');
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'RUNNING', 'MATCHED', 'MISMATCHED', 'FAILED');
CREATE TYPE "WorkOfferSource" AS ENUM ('DIRECT', 'PROPOSAL', 'INVITATION');

ALTER TABLE "SocialAccount"
  ADD COLUMN "providerAccountId" TEXT,
  ADD COLUMN "providerPageId" TEXT,
  ADD COLUMN "accessTokenEncrypted" TEXT,
  ADD COLUMN "refreshTokenEncrypted" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "syncStatus" "SocialSyncStatus" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "syncError" TEXT,
  ADD COLUMN "connectedAt" TIMESTAMP(3);

ALTER TABLE "Contract"
  ADD COLUMN "revisionLimit" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "publishBy" TIMESTAMP(3),
  ADD COLUMN "retentionDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "disputeWindowDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "disclosureRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "WorkOffer"
  ADD COLUMN "sourceType" "WorkOfferSource" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "sourceId" TEXT;

CREATE TABLE "SocialStat" (
  "id" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "followerCount" INTEGER NOT NULL,
  "followingCount" INTEGER,
  "mediaCount" INTEGER,
  "reach" INTEGER,
  "impressions" INTEGER,
  "engagementCount" INTEGER,
  "engagementRate" DECIMAL(8,4),
  "raw" JSONB,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialOAuthState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SocialPlatform" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "redirectTo" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "resultAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowcaseConsent" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "decision" "ShowcaseConsentDecision" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShowcaseConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "accountNumberEncrypted" TEXT NOT NULL,
  "bankCode" TEXT,
  "last4" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MNT',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerAccount" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "code" TEXT NOT NULL,
  "type" "LedgerAccountType" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MNT',
  "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "debitAccountId" TEXT NOT NULL,
  "creditAccountId" TEXT NOT NULL,
  "collaborationId" TEXT,
  "paymentId" TEXT,
  "type" "LedgerEntryType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MNT',
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerEntry_distinct_accounts" CHECK ("debitAccountId" <> "creditAccountId"),
  CONSTRAINT "LedgerEntry_positive_amount" CHECK ("amount" > 0)
);

CREATE TABLE "ReconciliationRun" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "providerTotal" DECIMAL(18,2),
  "ledgerTotal" DECIMAL(18,2),
  "discrepancy" DECIMAL(18,2),
  "checkedRecords" INTEGER NOT NULL DEFAULT 0,
  "mismatchCount" INTEGER NOT NULL DEFAULT 0,
  "details" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReconciliationRun_valid_period" CHECK ("periodEnd" > "periodStart")
);

CREATE TABLE "PublishProof" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "deliverableId" TEXT,
  "submittedById" TEXT NOT NULL,
  "socialAccountId" TEXT,
  "screenshotId" TEXT,
  "postUrl" TEXT NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "status" "PublishProofStatus" NOT NULL DEFAULT 'SUBMITTED',
  "metrics" JSONB,
  "providerPostId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "retentionDueAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublishProof_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAccount_platform_providerAccountId_key" ON "SocialAccount"("platform", "providerAccountId");
CREATE INDEX "SocialAccount_syncStatus_lastSyncAt_idx" ON "SocialAccount"("syncStatus", "lastSyncAt");
CREATE INDEX "SocialStat_socialAccountId_capturedAt_idx" ON "SocialStat"("socialAccountId", "capturedAt" DESC);
CREATE UNIQUE INDEX "SocialOAuthState_tokenHash_key" ON "SocialOAuthState"("tokenHash");
CREATE INDEX "SocialOAuthState_userId_provider_expiresAt_idx" ON "SocialOAuthState"("userId", "provider", "expiresAt");
CREATE UNIQUE INDEX "WorkOffer_sourceType_sourceId_key" ON "WorkOffer"("sourceType", "sourceId");
CREATE UNIQUE INDEX "ShowcaseConsent_collaborationId_userId_key" ON "ShowcaseConsent"("collaborationId", "userId");
CREATE INDEX "ShowcaseConsent_userId_decision_idx" ON "ShowcaseConsent"("userId", "decision");
CREATE INDEX "PayoutAccount_userId_isDefault_idx" ON "PayoutAccount"("userId", "isDefault");
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE UNIQUE INDEX "LedgerAccount_ownerId_type_currency_key" ON "LedgerAccount"("ownerId", "type", "currency");
CREATE INDEX "LedgerAccount_type_currency_idx" ON "LedgerAccount"("type", "currency");
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_debitAccountId_occurredAt_idx" ON "LedgerEntry"("debitAccountId", "occurredAt");
CREATE INDEX "LedgerEntry_creditAccountId_occurredAt_idx" ON "LedgerEntry"("creditAccountId", "occurredAt");
CREATE INDEX "LedgerEntry_collaborationId_occurredAt_idx" ON "LedgerEntry"("collaborationId", "occurredAt");
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");
CREATE UNIQUE INDEX "ReconciliationRun_provider_periodStart_periodEnd_key" ON "ReconciliationRun"("provider", "periodStart", "periodEnd");
CREATE INDEX "ReconciliationRun_status_createdAt_idx" ON "ReconciliationRun"("status", "createdAt");
CREATE INDEX "PublishProof_collaborationId_status_idx" ON "PublishProof"("collaborationId", "status");
CREATE INDEX "PublishProof_retentionDueAt_status_idx" ON "PublishProof"("retentionDueAt", "status");
CREATE INDEX "PublishProof_socialAccountId_createdAt_idx" ON "PublishProof"("socialAccountId", "createdAt");

ALTER TABLE "SocialStat" ADD CONSTRAINT "SocialStat_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialOAuthState" ADD CONSTRAINT "SocialOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialOAuthState" ADD CONSTRAINT "SocialOAuthState_resultAccountId_fkey" FOREIGN KEY ("resultAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShowcaseConsent" ADD CONSTRAINT "ShowcaseConsent_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseConsent" ADD CONSTRAINT "ShowcaseConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutAccount" ADD CONSTRAINT "PayoutAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublishProof" ADD CONSTRAINT "PublishProof_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishProof" ADD CONSTRAINT "PublishProof_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublishProof" ADD CONSTRAINT "PublishProof_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublishProof" ADD CONSTRAINT "PublishProof_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublishProof" ADD CONSTRAINT "PublishProof_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
