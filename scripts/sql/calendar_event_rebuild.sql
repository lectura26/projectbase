-- Run in Supabase SQL Editor before relying on the new CalendarEvent shape.
-- Adjust if your table already partially matches.

ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "CalendarEvent" ce
SET "userId" = p."userId"
FROM "Project" p
WHERE ce."projectId" = p."id" AND (ce."userId" IS NULL OR ce."userId" = '');

UPDATE "CalendarEvent" SET "startTime" = "eventTime" WHERE "eventTime" IS NOT NULL AND ("startTime" IS NULL OR "startTime" = '');

ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "CalendarEvent_projectId_fkey";

ALTER TABLE "CalendarEvent" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

DELETE FROM "CalendarEvent" WHERE "userId" IS NULL;

ALTER TABLE "CalendarEvent" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "CalendarEvent_userId_fkey";
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "CalendarEvent" DROP COLUMN IF EXISTS "eventTime";
ALTER TABLE "CalendarEvent" DROP COLUMN IF EXISTS "externalId";

DROP INDEX IF EXISTS "CalendarEvent_externalId_idx";
