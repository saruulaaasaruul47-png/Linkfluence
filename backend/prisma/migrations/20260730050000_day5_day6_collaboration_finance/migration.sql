ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'DECLINED_BY_BUSINESS';

ALTER TABLE "WorkOffer"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Collaboration"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "termsVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "ContractVersion"
  ADD COLUMN "creatorApprovedAt" TIMESTAMP(3),
  ADD COLUMN "businessApprovedAt" TIMESTAMP(3);

ALTER TABLE "Deliverable"
  ADD COLUMN "revisionOfId" TEXT;

ALTER TABLE "ShowcasePost"
  ADD COLUMN "collaborationId" TEXT;

CREATE TABLE "OfferRevision" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgreementVersion" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "terms" JSONB NOT NULL,
  "changeNote" TEXT,
  "lockedAt" TIMESTAMP(3),
  "creatorApprovedAt" TIMESTAMP(3),
  "businessApprovedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationTask" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "ownerRole" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationFile" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "mediaAssetId" TEXT,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "kind" TEXT NOT NULL DEFAULT 'PROJECT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationActivity" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentProviderEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "paymentId" TEXT,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "tokenRef" TEXT NOT NULL,
  "brand" TEXT,
  "last4" TEXT,
  "expMonth" INTEGER,
  "expYear" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentPayout" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferRevision_offerId_version_key" ON "OfferRevision"("offerId", "version");
CREATE INDEX "OfferRevision_offerId_createdAt_idx" ON "OfferRevision"("offerId", "createdAt");
CREATE UNIQUE INDEX "AgreementVersion_collaborationId_version_key" ON "AgreementVersion"("collaborationId", "version");
CREATE INDEX "AgreementVersion_collaborationId_createdAt_idx" ON "AgreementVersion"("collaborationId", "createdAt");
CREATE INDEX "CollaborationTask_collaborationId_completedAt_idx" ON "CollaborationTask"("collaborationId", "completedAt");
CREATE INDEX "CollaborationFile_collaborationId_createdAt_idx" ON "CollaborationFile"("collaborationId", "createdAt");
CREATE INDEX "CollaborationActivity_collaborationId_createdAt_idx" ON "CollaborationActivity"("collaborationId", "createdAt");
CREATE UNIQUE INDEX "ShowcasePost_collaborationId_key" ON "ShowcasePost"("collaborationId");
CREATE UNIQUE INDEX "PaymentProviderEvent_providerEventId_key" ON "PaymentProviderEvent"("providerEventId");
CREATE INDEX "PaymentProviderEvent_paymentId_createdAt_idx" ON "PaymentProviderEvent"("paymentId", "createdAt");
CREATE INDEX "PaymentProviderEvent_eventType_createdAt_idx" ON "PaymentProviderEvent"("eventType", "createdAt");
CREATE UNIQUE INDEX "PaymentMethod_tokenRef_key" ON "PaymentMethod"("tokenRef");
CREATE INDEX "PaymentMethod_userId_isDefault_idx" ON "PaymentMethod"("userId", "isDefault");
CREATE UNIQUE INDEX "PaymentRefund_providerRef_key" ON "PaymentRefund"("providerRef");
CREATE INDEX "PaymentRefund_paymentId_status_idx" ON "PaymentRefund"("paymentId", "status");
CREATE UNIQUE INDEX "PaymentPayout_providerRef_key" ON "PaymentPayout"("providerRef");
CREATE INDEX "PaymentPayout_creatorId_status_idx" ON "PaymentPayout"("creatorId", "status");
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");
CREATE INDEX "OutboxEvent_topic_aggregateId_idx" ON "OutboxEvent"("topic", "aggregateId");

ALTER TABLE "OfferRevision" ADD CONSTRAINT "OfferRevision_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "WorkOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRevision" ADD CONSTRAINT "OfferRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationTask" ADD CONSTRAINT "CollaborationTask_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationTask" ADD CONSTRAINT "CollaborationTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationFile" ADD CONSTRAINT "CollaborationFile_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationFile" ADD CONSTRAINT "CollaborationFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationFile" ADD CONSTRAINT "CollaborationFile_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationActivity" ADD CONSTRAINT "CollaborationActivity_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationActivity" ADD CONSTRAINT "CollaborationActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "Deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShowcasePost" ADD CONSTRAINT "ShowcasePost_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentPayout" ADD CONSTRAINT "PaymentPayout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentPayout" ADD CONSTRAINT "PaymentPayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
