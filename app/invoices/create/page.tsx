import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getInvoiceStudioData, getNextInvoiceNumber } from "@/controllers/invoices";
import { listOpenEntries } from "@/models/projects";
import type { InvoiceLine } from "@/views/invoices/line-items-grid";
import { InvoiceForm, InvoiceStudioProvider } from "@/views/invoices/invoice-form";
import { ConnectedPreview } from "@/views/invoices/invoice-preview";
import { InvoiceStudioFrame } from "@/views/invoices/invoice-studio-frame";

export const metadata: Metadata = {
  title: "Invoice Studio",
};

export default async function CreateInvoicePage({ searchParams }: { searchParams: Promise<{ project?: string; entries?: string }> }) {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const query = await searchParams;
  const entryIds = (query.entries ?? "").split(",").map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const [data, invoiceNumber, entries] = await Promise.all([
    getInvoiceStudioData(),
    getNextInvoiceNumber("CON"),
    listOpenEntries(entryIds),
  ]);
  const initialLines: InvoiceLine[] = entries.map((entry) => ({
    id: entry.id,
    projectEntryId: entry.id,
    inventoryItemId: "",
    name: entry.item,
    quantity: String(entry.quantity),
    unitType: entry.description || "Unit",
    centralRate: entry.unitPrice,
    overrideRate: String(entry.unitPrice),
  }));

  return (
    <InvoiceStudioProvider key={query.entries ?? "new"} data={data} initialInvoiceNumber={invoiceNumber} initialProjectId={query.project} initialLines={initialLines}>
      <InvoiceStudioFrame form={<InvoiceForm />} preview={<ConnectedPreview />} />
    </InvoiceStudioProvider>
  );
}
