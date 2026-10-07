CREATE TYPE "public"."advance_payment_mode" AS ENUM('CASH', 'UPI', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."ledger_entity_type" AS ENUM('PROJECT', 'CLIENT', 'PERSON');--> statement-breakpoint
CREATE TYPE "public"."ledger_stock_source" AS ENUM('CENTRAL_INVENTORY', 'DIRECT_PURCHASE');--> statement-breakpoint
CREATE TABLE "staff_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"request_date" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_mode" "advance_payment_mode" NOT NULL,
	"notes" text,
	"settlement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "entity_type" "ledger_entity_type" DEFAULT 'PROJECT' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "event_type" text DEFAULT 'MATERIAL_DRAW' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "final_price" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "stock_source" "ledger_stock_source" DEFAULT 'DIRECT_PURCHASE' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "inventory_item_id" uuid;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "settlement_date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "gross_earned" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "prior_balance_carryover" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "prior_advance_carryover" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "current_cycle_advances" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "total_deductions" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "net_amount_due" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "amount_paid" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "closing_balance" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "new_balance_carryover" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "new_advance_carryover" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_settlement_id_payroll_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."payroll_settlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;