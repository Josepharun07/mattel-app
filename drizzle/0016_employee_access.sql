ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "account_role" text DEFAULT 'STAFF' NOT NULL;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "page_access" text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL;
