-- Run in Supabase SQL Editor (after review)
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "TaskNote" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;
ALTER TABLE "TaskNote" ALTER COLUMN "taskId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskNote_meetingId_fkey'
  ) THEN
    ALTER TABLE "TaskNote"
      ADD CONSTRAINT "TaskNote_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TaskNote_meetingId_idx" ON "TaskNote"("meetingId");

ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_meetingId_fkey'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Comment_meetingId_idx" ON "Comment"("meetingId");
