CREATE TYPE "public"."resort_lease_status" AS ENUM('ACTIVE', 'EXPIRED', 'TERMINATED');--> statement-breakpoint
CREATE TABLE "resort_leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_name" text NOT NULL,
	"operator_name" text NOT NULL,
	"operator_contact" text NOT NULL,
	"operator_email" text,
	"operator_gstin" text,
	"monthly_rent_amount" numeric(14, 2) NOT NULL,
	"billing_due_day" integer DEFAULT 1 NOT NULL,
	"lease_start_date" date NOT NULL,
	"lease_end_date" date NOT NULL,
	"status" "resort_lease_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "resort_lease_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_resort_lease_id_resort_leases_id_fk" FOREIGN KEY ("resort_lease_id") REFERENCES "public"."resort_leases"("id") ON DELETE set null ON UPDATE no action;