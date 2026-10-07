import type { Metadata } from "next";
import { getInvoiceStudioData, getNextInvoiceNumber } from "@/actions/invoice-actions";
import { getCompileDraft } from "@/actions/ledger-actions";
import { InvoiceForm, InvoiceStudioProvider } from "@/components/invoices/invoice-form";
import { ConnectedPreview } from "@/components/invoices/invoice-preview";

export const metadata: Metadata = {
  title: "Invoice Studio",
};

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ compiled?: string; projectId?: string; entryIds?: string }>;
}) {
  const params = await searchParams;
  const entryIds = (params.entryIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [data, invoiceNumber, compiled] = await Promise.all([
    getInvoiceStudioData(),
    getNextInvoiceNumber("CON"),
    entryIds.length > 0 ? getCompileDraft(params.projectId ?? "", entryIds) : Promise.resolve(null),
  ]);

  return (
    <InvoiceStudioProvider data={data} initialInvoiceNumber={params.compiled || invoiceNumber} compiled={compiled}>
      <div className="grid min-h-[calc(100svh-3.5rem)] grid-cols-1 lg:h-[calc(100svh-3.5rem)] lg:grid-cols-2 lg:overflow-hidden">
        {entryIds.length > 0 ? (
          <p className="no-print col-span-full bg-amber-50 px-5 py-2 text-sm text-amber-900">
            Compiled from the project ledger
            {compiled?.projectName ? ` for ${compiled.projectName}` : ""}. {entryIds.length} selected{" "}
            {entryIds.length === 1 ? "row" : "rows"} will leave the unbilled book when this invoice is saved.
          </p>
        ) : params.compiled ? (
          <p className="no-print col-span-full bg-amber-50 px-5 py-2 text-sm text-amber-900">
            Compiled from the project ledger as {params.compiled}.
          </p>
        ) : null}
        <InvoiceForm />
        <section className="overflow-auto bg-canvas p-5 lg:sticky lg:top-14 lg:h-[calc(100svh-3.5rem)]">
          <p className="no-print mb-3 text-xs tracking-wide text-muted-foreground">Live A4 preview</p>
          <ConnectedPreview />
        </section>
      </div>
    </InvoiceStudioProvider>
  );
}
