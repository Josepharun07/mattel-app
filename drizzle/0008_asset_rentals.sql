CREATE TYPE "public"."asset_current_status" AS ENUM('AVAILABLE', 'RENTED_INTERNAL', 'RENTED_EXTERNAL', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."assignment_borrower_type" AS ENUM('INTERNAL_WORKER', 'EXTERNAL_RENTER');--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "borrower_type" "assignment_borrower_type" DEFAULT 'EXTERNAL_RENTER' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "staff_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "external_borrower_name" text;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "external_borrower_phone" text;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "condition_on_issue" text DEFAULT 'GOOD' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "condition_on_return" text;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "daily_rate_applied" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "total_rent_charged" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "category" text DEFAULT 'POWER_TOOLS' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "current_status" "asset_current_status" DEFAULT 'AVAILABLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "default_daily_rate" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_serial_number_unique" UNIQUE("serial_number");