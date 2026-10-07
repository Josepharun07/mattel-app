CREATE TABLE "asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid,
	"assignee_type" text NOT NULL,
	"employee_id" uuid,
	"external_name" text,
	"external_phone" text,
	"external_id_details" text,
	"issue_date" date DEFAULT now() NOT NULL,
	"expected_return_date" date NOT NULL,
	"actual_return_date" date,
	"condition_notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_name" text NOT NULL,
	"asset_code" text,
	"status" text DEFAULT 'Available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "assets_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"performed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "central_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_name" text NOT NULL,
	"unit_type" text NOT NULL,
	"standard_unit_rate" numeric(14, 2) DEFAULT '0.0' NOT NULL,
	"current_stock" numeric(14, 2) DEFAULT '0.0' NOT NULL,
	"min_safety_threshold" numeric(14, 2) DEFAULT '0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid,
	"payment_date" date DEFAULT now() NOT NULL,
	"amount_paid" numeric(14, 2) NOT NULL,
	"payment_mode" text NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"project_id" uuid,
	"client_id" uuid,
	"invoice_type" text DEFAULT 'CONSTRUCTION' NOT NULL,
	"issue_date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"subtotal" numeric(14, 2) NOT NULL,
	"cgst" numeric(14, 2) DEFAULT '0.0',
	"sgst" numeric(14, 2) DEFAULT '0.0',
	"igst" numeric(14, 2) DEFAULT '0.0',
	"grand_total" numeric(14, 2) NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0.0',
	"payment_status" text DEFAULT 'Unpaid' NOT NULL,
	"stationery_mode" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"invoice_id" uuid,
	"entry_date" timestamp with time zone DEFAULT now() NOT NULL,
	"material_name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_type" text NOT NULL,
	"central_rate" numeric(14, 2) NOT NULL,
	"override_rate" numeric(14, 2) NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"transit_pass_number" text,
	"eway_bill_number" text,
	"vehicle_number" text,
	"source" text DEFAULT 'DIRECT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"title" text NOT NULL,
	"location" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subcontract_draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcontract_id" uuid,
	"draw_date" date DEFAULT now() NOT NULL,
	"amount_paid" numeric(14, 2) NOT NULL,
	"payment_mode" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subcontracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"lead_person_type" text NOT NULL,
	"lead_employee_id" uuid,
	"external_lead_name" text,
	"external_lead_phone" text,
	"team_members" jsonb,
	"total_contract_amount" numeric(14, 2) DEFAULT '0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text DEFAULT 'Mattel Infrastructures' NOT NULL,
	"tagline" text DEFAULT 'Building Tomorrow''s Foundation',
	"address" text,
	"phone" text,
	"email" text,
	"gstin" text,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text,
	"upi_id" text,
	"default_terms" text,
	"unit_types" jsonb DEFAULT '["Loads", "Bags", "CFT", "Tons", "Hours", "Days", "Trips"]'::jsonb,
	"logo_url" text,
	"signature_url" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontract_draws" ADD CONSTRAINT "subcontract_draws_subcontract_id_subcontracts_id_fk" FOREIGN KEY ("subcontract_id") REFERENCES "public"."subcontracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontracts" ADD CONSTRAINT "subcontracts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;