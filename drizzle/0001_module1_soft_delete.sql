ALTER TABLE "invoice_payments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "deleted_at" timestamp with time zone;