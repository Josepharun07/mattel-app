ALTER TABLE "system_settings" ALTER COLUMN "bank_name" SET DEFAULT 'State Bank of India';--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "account_name" text DEFAULT 'Mattel Infrastructures Operating Account' NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "default_stationery_mode" boolean DEFAULT false NOT NULL;