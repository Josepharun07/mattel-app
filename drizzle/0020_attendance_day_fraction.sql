ALTER TABLE "attendance_logs" ADD COLUMN "day_fraction" numeric(14, 2) DEFAULT 1.00 NOT NULL;
UPDATE "attendance_logs" SET "day_fraction" = 0 WHERE "is_present" = false;
