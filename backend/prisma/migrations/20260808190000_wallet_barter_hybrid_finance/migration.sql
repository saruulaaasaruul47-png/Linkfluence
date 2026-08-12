-- Wallet-first PAID / BARTER / HYBRID finance foundation.
CREATE TYPE "CollaborationPaymentType" AS ENUM ('PAID', 'BARTER', 'HYBRID');
CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "PlatformRevenueSource" AS ENUM ('PAID_COMMISSION', 'BARTER_SERVICE_FEE', 'HYBRID_COMMISSION', 'OTHER');
CREATE TYPE "PlatformRevenueStatus" AS ENUM ('PENDING', 'EARNED', 'REFUNDED');

ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'BUSINESS_WALLET';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'CREATOR_PENDING';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'CREATOR_AVAILABLE';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'PLATFORM_PENDING';

ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'TOP_UP';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'COLLABORATION_FUNDING';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'BARTER_PLATFORM_FEE';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'CREATOR_PENDING';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'CREATOR_RELEASE';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PLATFORM_COMMISSION_PENDING';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PLATFORM_COMMISSION_EARNED';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PLATFORM_BARTER_FEE_PENDING';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PLATFORM_BARTER_FEE_EARNED';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'REFUND';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PAYOUT';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'BARTER_PLATFORM_FEE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FUNDING_REQUIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_RELEASE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

ALTER TABLE "WorkOffer"
  ADD COLUMN "paymentType" "CollaborationPaymentType" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "barterDetails" JSONB;

ALTER TABLE "Collaboration"
  ADD COLUMN "paymentType" "CollaborationPaymentType" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "cashAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "barterEstimatedValue" DECIMAL(18,2),
  ADD COLUMN "barterDetails" JSONB;

UPDATE "Collaboration"
SET "cashAmount" = COALESCE(NULLIF("terms"->>'budget', '')::DECIMAL, 0)
WHERE "cashAmount" = 0;

ALTER TABLE "Payment"
  ADD COLUMN "compensationType" "CollaborationPaymentType" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "cashAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "barterEstimatedValue" DECIMAL(18,2),
  ADD COLUMN "commissionRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN "commissionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "creatorAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "fundedAt" TIMESTAMP(3),
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3);

UPDATE "Payment"
SET "cashAmount" = "amount",
    "commissionAmount" = "platformFee",
    "creatorAmount" = GREATEST("amount" - "platformFee", 0),
    "commissionRate" = CASE WHEN "amount" > 0 THEN ROUND(("platformFee" / "amount") * 100, 4) ELSE 0 END,
    "fundedAt" = CASE WHEN "status" = 'FUNDED' THEN "processedAt" ELSE NULL END,
    "releasedAt" = CASE WHEN "status" IN ('RELEASED', 'PAID') THEN "processedAt" ELSE NULL END;

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_single_collaboration_funding_key"
  ON "Payment"("collaborationId") WHERE "type" IN ('FUNDING', 'BARTER_PLATFORM_FEE');

ALTER TABLE "PaymentProviderEvent" ADD COLUMN "walletTopUpId" TEXT;

CREATE TABLE "WalletTopUp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MNT',
  "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "providerRef" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "failureReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletTopUp_providerRef_key" ON "WalletTopUp"("providerRef");
CREATE UNIQUE INDEX "WalletTopUp_idempotencyKey_key" ON "WalletTopUp"("idempotencyKey");
CREATE INDEX "WalletTopUp_userId_status_createdAt_idx" ON "WalletTopUp"("userId", "status", "createdAt");

CREATE TABLE "PlatformRevenue" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT,
  "collaborationId" TEXT NOT NULL,
  "source" "PlatformRevenueSource" NOT NULL,
  "status" "PlatformRevenueStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MNT',
  "earnedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformRevenue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformRevenue_paymentId_key" ON "PlatformRevenue"("paymentId");
CREATE INDEX "PlatformRevenue_status_source_createdAt_idx" ON "PlatformRevenue"("status", "source", "createdAt");
CREATE INDEX "PlatformRevenue_collaborationId_idx" ON "PlatformRevenue"("collaborationId");
CREATE INDEX "PaymentProviderEvent_walletTopUpId_createdAt_idx" ON "PaymentProviderEvent"("walletTopUpId", "createdAt");

ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_walletTopUpId_fkey"
  FOREIGN KEY ("walletTopUpId") REFERENCES "WalletTopUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformRevenue" ADD CONSTRAINT "PlatformRevenue_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformRevenue" ADD CONSTRAINT "PlatformRevenue_collaborationId_fkey"
  FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
