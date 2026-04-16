-- Run in Supabase SQL Editor (or psql) before using Visuals tab / todo reorder.
-- Prisma field maps DB column "order" on TodoItem as sortOrder.

ALTER TABLE "TodoItem" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Visual" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visual_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Visual_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE,
  CONSTRAINT "Visual_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
    ON DELETE CASCADE
);

ALTER TABLE "Visual" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visual_select_own" ON "Visual";
CREATE POLICY "visual_select_own" ON "Visual"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "Visual"."projectId"
      AND p."userId" = auth.uid()::text
    )
  );
