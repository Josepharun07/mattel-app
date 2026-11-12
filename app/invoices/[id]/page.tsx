import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvoiceDocument } from "@/controllers/invoices";
import { getSystemSettings } from "@/controllers/settings";
import { InvoiceNameField } from "@/views/invoices/invoice-name";
import { InvoiceSheet } from "@/views/invoices/invoice-sheet";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const { id } = await params;
  const [invoice, company] = await Promise.all([getInvoiceDocument(id), getSystemSettings()]);
  if (!invoice || !invoice.projectId) notFound();

  return (
    <PageFrame
      eyebrow={invoice.finalized ? "Finished invoice" : "Draft invoice"}
      leading={<InvoiceNameField invoiceId={invoice.id} initialName={invoice.invoiceName} />}
      title={invoice.invoiceNumber}
      description={invoice.finalized ? "This invoice is finished. Edit starts a new version and leaves this one unchanged." : "This draft can still be changed. Finish it when it should be locked."}
      width="wide"
    >
      <InvoiceSheet
        company={company}
        projectId={invoice.projectId}
        projectName={invoice.projectName}
        clients={invoice.clients}
        invoiceNumber={invoice.invoiceNumber}
        invoiceId={invoice.id}
        finalized={invoice.finalized}
        initialClientId={invoice.clientId}
        initialDate={invoice.issueDate}
        initialTransit={invoice.transitPassNo}
        initialEway={invoice.ewayBillNo}
        initialTerms={invoice.terms}
        initialGst={invoice.gstEnabled}
        initialInterstate={invoice.interstate}
        lines={invoice.lines}
      />
    </PageFrame>
  );
}
