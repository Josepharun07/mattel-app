ALTER TABLE "site_diary" ADD COLUMN IF NOT EXISTS "labour_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_diary" ADD COLUMN IF NOT EXISTS "skilled_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_diary" ADD COLUMN IF NOT EXISTS "hindrance" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_diary" ADD COLUMN IF NOT EXISTS "instructions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "boq_items" ADD COLUMN IF NOT EXISTS "section" text DEFAULT 'Civil' NOT NULL;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "retention_percent" numeric(14, 2) DEFAULT '5' NOT NULL;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "retention_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "net_payable" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "unit" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "expected_on" date;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "rejected_quantity" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "material_issues" ADD COLUMN IF NOT EXISTS "cost_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_logs" ADD COLUMN IF NOT EXISTS "ownership" text DEFAULT 'HIRED' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_logs" ADD COLUMN IF NOT EXISTS "operator_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_logs" ADD COLUMN IF NOT EXISTS "site_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_logs" ADD COLUMN IF NOT EXISTS "opening_reading" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_logs" ADD COLUMN IF NOT EXISTS "closing_reading" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD COLUMN IF NOT EXISTS "committed_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "drawings" ADD COLUMN IF NOT EXISTS "discipline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "drawings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'CURRENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "drawings" ADD COLUMN IF NOT EXISTS "remarks" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfis" ADD COLUMN IF NOT EXISTS "discipline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfis" ADD COLUMN IF NOT EXISTS "asked_by" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfis" ADD COLUMN IF NOT EXISTS "due_date" date;--> statement-breakpoint
ALTER TABLE "submittals" ADD COLUMN IF NOT EXISTS "submittal_type" text DEFAULT 'SAMPLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "submittals" ADD COLUMN IF NOT EXISTS "reviewer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "toolbox_talks" ADD COLUMN IF NOT EXISTS "duration_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "toolbox_talks" ADD COLUMN IF NOT EXISTS "hazards" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'NEAR_MISS' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "lost_hours" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "immediate_action" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "leave_type" text DEFAULT 'CASUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "days" numeric(14, 2) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "wage_deductions" ADD COLUMN IF NOT EXISTS "employer_pf" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wage_deductions" ADD COLUMN IF NOT EXISTS "employer_esi" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wage_deductions" ADD COLUMN IF NOT EXISTS "cost_to_company" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "cost_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "requested_by" text DEFAULT '' NOT NULL;