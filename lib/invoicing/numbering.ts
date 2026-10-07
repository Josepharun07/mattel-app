import { generateInvoiceNumber } from "@/lib/engines/invoice-engine";
import type { InvoiceKind } from "@/lib/invoicing/types";

export function formatInvoiceNumber(
  invoiceType: InvoiceKind,
  sequence: number,
  issueDate: Date,
): string {
  const type = invoiceType === "RESORT" ? "RES" : "CON";
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.trunc(sequence)) : 0;
  return generateInvoiceNumber(type, issueDate.getFullYear(), safeSequence);
}
