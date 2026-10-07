import type { Metadata } from "next";
import { getResortLeases } from "@/actions/resort-actions";
import { ResortInvoiceDesk } from "@/components/resort-rental/resort-invoice-desk";

export const metadata: Metadata = { title: "Resort invoices" };

export default async function ResortInvoicesPage() {
  const directory = await getResortLeases();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Resort</p>
      <h1 className="mt-1 text-2xl font-semibold">Lease invoices</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Collections against MI/RES invoices. An unpaid invoice past its due date stays overdue until it is paid.
      </p>
      <ResortInvoiceDesk initial={directory} />
    </div>
  );
}
