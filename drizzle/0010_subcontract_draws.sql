CREATE TYPE "public"."subcontract_status" AS ENUM('ACTIVE', 'COMPLETED', 'TERMINATED');--> statement-breakpoint
ALTER TABLE "subcontracts" ALTER COLUMN "team_members" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "subcontract_draws" ADD COLUMN "reference_number" text;--> statement-breakpoint
ALTER TABLE "subcontracts" ADD COLUMN "lead_staff_id" uuid;--> statement-breakpoint
ALTER TABLE "subcontracts" ADD COLUMN "status" "subcontract_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontracts" ADD CONSTRAINT "subcontracts_lead_staff_id_staff_id_fk" FOREIGN KEY ("lead_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;