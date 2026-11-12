import { generateInvoiceNumber } from "@/lib/engines/invoice-engine";

export function formatInvoiceNumber(partyCode: string, sequence: number, issueDate: Date): string {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.trunc(sequence)) : 0;
  return generateInvoiceNumber(partyCode, issueDate.getFullYear(), safeSequence);
}
