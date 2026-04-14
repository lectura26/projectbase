-- Run in Supabase SQL editor if not using Prisma migrate.
-- TaskNote with author (Prisma schema); extends the minimal TaskNote idea with authorId for attribution.

CREATE TABLE IF NOT EXISTS "TaskNote" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskNote_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TaskNote_taskId_idx" ON "TaskNote"("taskId");

ALTER TABLE "TaskNote" ENABLE ROW LEVEL SECURITY;

-- Policy: project owner can access notes on tasks in their projects (matches app-level checks).
-- Adjust if you use project members + RLS for shared access.
CREATE POLICY "tasknote_select_own" ON "TaskNote"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Task" t
      JOIN "Project" p ON p.id = t."projectId"
      WHERE t.id = "TaskNote"."taskId"
      AND p."userId" = auth.uid()::text
    )
  );
