import type { Metadata } from "next";
import { getInvoiceStudioData, getNextInvoiceNumber } from "@/actions/invoice-actions";
import { InvoiceForm, InvoiceStudioProvider } from "@/components/invoices/invoice-form";
import { ConnectedPreview } from "@/components/invoices/invoice-preview";
import { InvoiceStudioFrame } from "@/components/invoices/invoice-studio-frame";

export const metadata: Metadata = {
  title: "Invoice Studio",
};

export default async function CreateInvoicePage() {
  const [data, invoiceNumber] = await Promise.all([getInvoiceStudioData(), getNextInvoiceNumber("CON")]);

  return (
    <InvoiceStudioProvider data={data} initialInvoiceNumber={invoiceNumber}>
      <InvoiceStudioFrame form={<InvoiceForm />} preview={<ConnectedPreview />} />
    </InvoiceStudioProvider>
  );
}
