CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "grantedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");
CREATE INDEX "UserPermission_permissionId_createdAt_idx" ON "UserPermission"("permissionId", "createdAt");
CREATE INDEX "UserPermission_grantedById_createdAt_idx" ON "UserPermission"("grantedById", "createdAt");

ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "description", "updatedAt") VALUES
  ('permission_view_finance', 'VIEW_FINANCE', 'View finance overview and revenue.', CURRENT_TIMESTAMP),
  ('permission_view_transactions', 'VIEW_TRANSACTIONS', 'View payment and ledger transactions.', CURRENT_TIMESTAMP),
  ('permission_manage_payouts', 'MANAGE_PAYOUTS', 'Approve, reject and reconcile payouts.', CURRENT_TIMESTAMP),
  ('permission_manage_refunds', 'MANAGE_REFUNDS', 'Issue and manage refunds.', CURRENT_TIMESTAMP),
  ('permission_manage_users', 'MANAGE_USERS', 'Manage user account state.', CURRENT_TIMESTAMP),
  ('permission_manage_channels', 'MANAGE_CHANNELS', 'Manage creator and business channels.', CURRENT_TIMESTAMP),
  ('permission_manage_content', 'MANAGE_CONTENT', 'Moderate platform content.', CURRENT_TIMESTAMP),
  ('permission_manage_platform', 'MANAGE_PLATFORM', 'Manage operational platform settings.', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
