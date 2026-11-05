ALTER TABLE "project_entries" ADD COLUMN "invoice_id" uuid;
ALTER TABLE "project_entries" ADD CONSTRAINT "project_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
