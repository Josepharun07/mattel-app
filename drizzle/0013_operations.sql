ALTER TABLE "staff" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "pan_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "aadhaar_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "upi_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "bank_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "account_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "ifsc_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "emergency_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "emergency_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "emergency_relation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "joining_date" date;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "blood_group" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"kind" text NOT NULL,
	"display_name" text NOT NULL,
	"access_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_username_unique" UNIQUE("username")
);--> statement-breakpoint
CREATE TABLE "app_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "app_sessions_token_hash_unique" UNIQUE("token_hash")
);--> statement-breakpoint
CREATE TABLE "job_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"built_in" boolean DEFAULT false NOT NULL,
	CONSTRAINT "job_roles_name_unique" UNIQUE("name")
);--> statement-breakpoint
CREATE TABLE "staff_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"phone_number" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "staff_role_assignments" (
	"staff_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "staff_role_assignments_staff_id_role_id_pk" PRIMARY KEY("staff_id","role_id")
);--> statement-breakpoint
CREATE TABLE "site_diary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" date NOT NULL,
	"project_name" text NOT NULL,
	"weather" text DEFAULT '' NOT NULL,
	"work_done" text NOT NULL,
	"quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"photo_name" text DEFAULT '' NOT NULL,
	"photo_data_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "boq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_code" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"contract_qty" numeric(14, 2) NOT NULL,
	"rate" numeric(14, 2) NOT NULL,
	"executed_qty" numeric(14, 2) DEFAULT '0' NOT NULL
);--> statement-breakpoint
CREATE TABLE "ra_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" text NOT NULL,
	"boq_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"cgst" numeric(14, 2) NOT NULL,
	"sgst" numeric(14, 2) NOT NULL,
	"igst" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"issued_on" date NOT NULL,
	CONSTRAINT "ra_bills_bill_number_unique" UNIQUE("bill_number")
);--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"vendor_name" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"rate" numeric(14, 2) NOT NULL,
	"issued_on" date NOT NULL,
	CONSTRAINT "purchase_orders_number_unique" UNIQUE("number")
);--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"received_on" date NOT NULL
);--> statement-breakpoint
CREATE TABLE "material_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_name" text NOT NULL,
	"project_name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"issued_on" date NOT NULL
);--> statement-breakpoint
CREATE TABLE "equipment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_name" text NOT NULL,
	"log_date" date NOT NULL,
	"run_hours" numeric(14, 2) NOT NULL,
	"idle_hours" numeric(14, 2) NOT NULL,
	"fuel_litres" numeric(14, 2) NOT NULL,
	"hire_rate" numeric(14, 2) NOT NULL,
	"breakdown" text DEFAULT '' NOT NULL
);--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_code" text NOT NULL,
	"name" text NOT NULL,
	"budget_amount" numeric(14, 2) NOT NULL,
	"actual_amount" numeric(14, 2) NOT NULL
);--> statement-breakpoint
CREATE TABLE "drawings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"revision" text NOT NULL,
	"revised_on" date NOT NULL
);--> statement-breakpoint
CREATE TABLE "rfis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "rfis_number_unique" UNIQUE("number")
);--> statement-breakpoint
CREATE TABLE "submittals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"spec_section" text DEFAULT '' NOT NULL,
	"status" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "toolbox_talks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talk_date" date NOT NULL,
	"topic" text NOT NULL,
	"attendees" text DEFAULT '' NOT NULL
);--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_date" date NOT NULL,
	"description" text NOT NULL,
	"people" text DEFAULT '' NOT NULL,
	"severity" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "wage_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_name" text NOT NULL,
	"period" text NOT NULL,
	"gross" numeric(14, 2) NOT NULL,
	"pf" numeric(14, 2) NOT NULL,
	"esi" numeric(14, 2) NOT NULL,
	"tds" numeric(14, 2) NOT NULL,
	"net" numeric(14, 2) NOT NULL
);--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payee" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL
);--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_phones" ADD CONSTRAINT "staff_phones_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_role_assignments" ADD CONSTRAINT "staff_role_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_role_assignments" ADD CONSTRAINT "staff_role_assignments_role_id_job_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."job_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_boq_id_boq_items_id_fk" FOREIGN KEY ("boq_id") REFERENCES "public"."boq_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;