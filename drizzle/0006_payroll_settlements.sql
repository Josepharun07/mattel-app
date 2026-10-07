CREATE TYPE "public"."payroll_checkout_type" AS ENUM('WEEKLY_CYCLED', 'MID_WEEK_CHECKOUT');--> statement-breakpoint
CREATE TYPE "public"."payroll_settlement_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
CREATE TABLE "payroll_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"days_present" numeric(14, 2) NOT NULL,
	"total_overtime_hours" numeric(14, 2) NOT NULL,
	"base_pay" numeric(14, 2) NOT NULL,
	"overtime_pay" numeric(14, 2) NOT NULL,
	"gross_payable" numeric(14, 2) NOT NULL,
	"checkout_type" "payroll_checkout_type" NOT NULL,
	"status" "payroll_settlement_status" DEFAULT 'PAID' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD COLUMN "settlement_id" uuid;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD CONSTRAINT "payroll_settlements_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_settlement_id_payroll_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."payroll_settlements"("id") ON DELETE set null ON UPDATE no action;