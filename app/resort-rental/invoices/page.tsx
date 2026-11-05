import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getResortLeases } from "@/controllers/resort";
import { ResortInvoiceDesk } from "@/views/resort-rental/resort-invoice-desk";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Resort invoices" };

export default async function ResortInvoicesPage() {
  const denied = await gate("resort.read");
  if (denied) return denied;

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
