import type { Metadata } from "next";
import { getResortLeases } from "@/actions/resort-actions";
import { ResortInvoiceDesk } from "@/components/resort-rental/resort-invoice-desk";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Resort invoices" };

export default async function ResortInvoicesPage() {
  const directory = await getResortLeases();

  return (
    <PageFrame
      eyebrow="Resort"
      title="Lease invoices"
      description="Collections against MI/RES invoices. An unpaid invoice past its due date stays overdue until it is paid."
    >
      <ResortInvoiceDesk initial={directory} />
    </PageFrame>
  );
}
