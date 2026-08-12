-- Day 2: turn legacy collaboration checklist items into versioned task-board records.
CREATE TYPE "CollaborationTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE "CollaborationTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

ALTER TABLE "CollaborationTask"
  ADD COLUMN "assigneeId" TEXT,
  ADD COLUMN "status" "CollaborationTaskStatus" NOT NULL DEFAULT 'TODO',
  ADD COLUMN "priority" "CollaborationTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "CollaborationTask"
SET "status" = CASE
  WHEN "completedAt" IS NOT NULL THEN 'DONE'::"CollaborationTaskStatus"
  ELSE 'TODO'::"CollaborationTaskStatus"
END;

WITH ordered_tasks AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "collaborationId"
    ORDER BY "createdAt", "id"
  ) - 1 AS position
  FROM "CollaborationTask"
)
UPDATE "CollaborationTask" AS task
SET "sortOrder" = ordered_tasks.position
FROM ordered_tasks
WHERE task."id" = ordered_tasks."id";

DROP INDEX IF EXISTS "CollaborationTask_collaborationId_completedAt_idx";
CREATE INDEX "CollaborationTask_collaborationId_status_sortOrder_idx"
  ON "CollaborationTask"("collaborationId", "status", "sortOrder");
CREATE INDEX "CollaborationTask_assigneeId_status_idx"
  ON "CollaborationTask"("assigneeId", "status");

ALTER TABLE "CollaborationTask"
  ADD CONSTRAINT "CollaborationTask_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
