import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNextInvoiceNumber } from "@/controllers/invoices";
import { getSystemSettings } from "@/controllers/settings";
import { findProject, listOpenEntries } from "@/models/projects";
import { InvoiceNameField } from "@/views/invoices/invoice-name";
import { InvoiceSheet } from "@/views/invoices/invoice-sheet";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Invoice" };

export default async function ComposeInvoicePage({ searchParams }: { searchParams: Promise<{ project?: string; entries?: string }> }) {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const query = await searchParams;
  if (!query.project) notFound();
  const entryIds = (query.entries ?? "").split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const [record, company, entries] = await Promise.all([
    findProject(query.project),
    getSystemSettings(),
    listOpenEntries(entryIds),
  ]);
  if (!record.project) notFound();
  const clients = record.clients.filter((client) => record.project?.clientIds.includes(client.id));
  const invoiceNumber = await getNextInvoiceNumber(record.project.publicCode || "XXX1");

  return (
    <PageFrame eyebrow="New invoice" leading={<InvoiceNameField />} title={invoiceNumber} description="This is the invoice. Edit any field, then save it." width="wide">
      <InvoiceSheet
        company={company}
        projectId={record.project.id}
        projectName={record.project.name}
        clients={clients.map((client) => ({ id: client.id, name: client.name, address: "", gstin: "" }))}
        invoiceNumber={invoiceNumber}
        lines={entries.map((entry) => ({
          id: entry.id,
          projectEntryId: entry.id,
          name: entry.item,
          unit: entry.description || "Unit",
          quantity: String(entry.quantity),
          rate: String(entry.unitPrice),
        }))}
      />
    </PageFrame>
  );
}
