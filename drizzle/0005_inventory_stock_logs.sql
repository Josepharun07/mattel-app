CREATE TYPE "public"."stock_change_type" AS ENUM('INBOUND_PURCHASE', 'OUTBOUND_INVOICE', 'MANUAL_CORRECTION', 'RETURN');--> statement-breakpoint
CREATE TABLE "inventory_stock_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"change_type" "stock_change_type" NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"previous_stock" numeric(14, 2) NOT NULL,
	"new_stock" numeric(14, 2) NOT NULL,
	"reference_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_stock_logs" ADD CONSTRAINT "inventory_stock_logs_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;