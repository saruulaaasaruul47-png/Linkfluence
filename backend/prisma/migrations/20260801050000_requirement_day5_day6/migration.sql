-- Day 5: durable outbox retry metadata and per-user email preferences.
ALTER TABLE "OutboxEvent"
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "OutboxEvent_processedAt_createdAt_idx";
CREATE INDEX "OutboxEvent_processedAt_deadLetteredAt_nextAttemptAt_idx"
  ON "OutboxEvent"("processedAt", "deadLetteredAt", "nextAttemptAt");

CREATE TABLE "NotificationPreference" (
  "userId" TEXT NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "offerEmail" BOOLEAN NOT NULL DEFAULT true,
  "proposalEmail" BOOLEAN NOT NULL DEFAULT true,
  "contractEmail" BOOLEAN NOT NULL DEFAULT true,
  "paymentEmail" BOOLEAN NOT NULL DEFAULT true,
  "deliverableEmail" BOOLEAN NOT NULL DEFAULT true,
  "proofEmail" BOOLEAN NOT NULL DEFAULT true,
  "payoutEmail" BOOLEAN NOT NULL DEFAULT true,
  "deadlineEmail" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "sourceEventId" TEXT;
CREATE UNIQUE INDEX "Notification_userId_sourceEventId_key"
  ON "Notification"("userId", "sourceEventId");
