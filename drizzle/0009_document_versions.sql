ALTER TABLE "invoices" ADD COLUMN "base_invoice_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "is_finalized" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "invoices" SET "base_invoice_number" = regexp_replace("invoice_number", '-v[0-9]+$', '') WHERE "base_invoice_number" IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "base_invoice_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "base_payslip_number" text;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "payslip_number" text;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "payroll_settlements" AS settlement
SET
  "base_payslip_number" = 'MI/PAY/' || to_char(settlement.settlement_date, 'YYYY') || '/' || lpad(numbered.seq::text, 4, '0'),
  "payslip_number" = 'MI/PAY/' || to_char(settlement.settlement_date, 'YYYY') || '/' || lpad(numbered.seq::text, 4, '0')
FROM (
  SELECT "id", row_number() OVER (PARTITION BY to_char("settlement_date", 'YYYY') ORDER BY "created_at", "id") AS seq
  FROM "payroll_settlements"
) AS numbered
WHERE settlement.id = numbered.id AND settlement.base_payslip_number IS NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ALTER COLUMN "base_payslip_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ALTER COLUMN "payslip_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settlements" ADD CONSTRAINT "payroll_settlements_payslip_number_unique" UNIQUE("payslip_number");
