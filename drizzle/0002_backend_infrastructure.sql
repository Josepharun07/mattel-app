CREATE TABLE "asset_rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_name" text NOT NULL,
	"borrower_type" text NOT NULL,
	"borrower_name" text NOT NULL,
	"borrower_contact" text,
	"daily_rate" numeric(14, 2) NOT NULL,
	"rented_at" timestamp with time zone NOT NULL,
	"returned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"work_date" timestamp with time zone NOT NULL,
	"is_present" boolean DEFAULT true NOT NULL,
	"overtime_hours" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "delivery_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"invoice_id" uuid,
	"material_name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_type" text NOT NULL,
	"central_rate" numeric(14, 2) NOT NULL,
	"override_rate" numeric(14, 2) NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"transit_pass_no" text,
	"eway_bill_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit_type" text NOT NULL,
	"central_rate" numeric(14, 2) NOT NULL,
	"current_stock" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"low_stock_threshold" numeric(14, 2) DEFAULT '10.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payroll_slips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"period_label" text NOT NULL,
	"days_present" integer NOT NULL,
	"total_overtime_hours" numeric(14, 2) NOT NULL,
	"base_pay" numeric(14, 2) NOT NULL,
	"overtime_pay" numeric(14, 2) NOT NULL,
	"total_pay" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"hourly_rate" numeric(14, 2) NOT NULL,
	"daily_base_rate" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"delivery_id" uuid,
	"direction" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"balance_after" numeric(14, 2) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_assignments" ALTER COLUMN "asset_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "performed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "central_inventory" ALTER COLUMN "standard_unit_rate" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "central_inventory" ALTER COLUMN "current_stock" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "central_inventory" ALTER COLUMN "min_safety_threshold" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "central_inventory" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "phone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_payments" ALTER COLUMN "invoice_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_payments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "cgst" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "cgst" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "sgst" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "sgst" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "igst" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "igst" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "amount_paid" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "amount_paid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "stationery_mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontract_draws" ALTER COLUMN "subcontract_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontract_draws" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontracts" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontracts" ALTER COLUMN "total_contract_amount" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "subcontracts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "address" SET DEFAULT 'Kerala, India';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "phone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "email" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "bank_name" SET DEFAULT 'Mattel Infrastructures Operating Account';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "bank_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "account_number" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "account_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "ifsc_code" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "ifsc_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "cgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "igst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "total_amount" numeric(14, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "transit_pass_no" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "eway_bill_no" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "letterhead_mode" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontract_draws" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_slips" ADD CONSTRAINT "payroll_slips_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_delivery_id_delivery_ledger_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_ledger"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;