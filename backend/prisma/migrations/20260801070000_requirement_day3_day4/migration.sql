-- Day 3: payout approval, immutable posting batches and reconciliation support.
ALTER TABLE "Collaboration"
  ADD COLUMN "autoApprovalDueAt" TIMESTAMP(3),
  ADD COLUMN "settlementDueAt" TIMESTAMP(3);

ALTER TABLE "PaymentPayout"
  ADD COLUMN "payoutAccountId" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "LedgerEntry"
  ADD COLUMN "postingBatchId" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "LedgerEntry" ALTER COLUMN "postingBatchId" DROP DEFAULT;

ALTER TABLE "TrustCase" ADD COLUMN "resolutionData" JSONB;

CREATE TABLE "PublishProofMetricSnapshot" (
  "id" TEXT NOT NULL,
  "proofId" TEXT NOT NULL,
  "reach" INTEGER,
  "views" INTEGER,
  "likes" INTEGER,
  "comments" INTEGER,
  "shares" INTEGER,
  "engagement" INTEGER,
  "isLive" BOOLEAN NOT NULL,
  "source" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishProofMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentPayout_payoutAccountId_status_idx" ON "PaymentPayout"("payoutAccountId", "status");
CREATE INDEX "LedgerEntry_postingBatchId_idx" ON "LedgerEntry"("postingBatchId");
CREATE INDEX "PublishProofMetricSnapshot_proofId_capturedAt_idx" ON "PublishProofMetricSnapshot"("proofId", "capturedAt");

ALTER TABLE "PaymentPayout"
  ADD CONSTRAINT "PaymentPayout_payoutAccountId_fkey"
  FOREIGN KEY ("payoutAccountId") REFERENCES "PayoutAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PublishProofMetricSnapshot"
  ADD CONSTRAINT "PublishProofMetricSnapshot_proofId_fkey"
  FOREIGN KEY ("proofId") REFERENCES "PublishProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Financial journal rows are append-only. Corrections must use compensating entries.
CREATE OR REPLACE FUNCTION prevent_ledger_entry_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'LedgerEntry is immutable; create a compensating entry instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LedgerEntry_immutable_update"
BEFORE UPDATE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_mutation();
