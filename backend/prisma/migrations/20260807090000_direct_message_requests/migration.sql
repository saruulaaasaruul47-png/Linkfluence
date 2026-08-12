-- Workspace-free Creator/Business message requests. A conversation becomes writable only after acceptance.
CREATE TYPE "MessageRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

ALTER TABLE "Conversation" ADD COLUMN "directKey" TEXT;

CREATE TABLE "MessageRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "conversationId" TEXT,
    "initialMessage" TEXT NOT NULL,
    "status" "MessageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessageRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_directKey_key" ON "Conversation"("directKey");
CREATE INDEX "MessageRequest_recipientId_status_createdAt_idx" ON "MessageRequest"("recipientId", "status", "createdAt" DESC);
CREATE INDEX "MessageRequest_senderId_status_createdAt_idx" ON "MessageRequest"("senderId", "status", "createdAt" DESC);
CREATE INDEX "MessageRequest_senderId_recipientId_status_idx" ON "MessageRequest"("senderId", "recipientId", "status");

ALTER TABLE "MessageRequest" ADD CONSTRAINT "MessageRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRequest" ADD CONSTRAINT "MessageRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRequest" ADD CONSTRAINT "MessageRequest_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
