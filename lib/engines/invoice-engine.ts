import { roundMoney } from "@/lib/money";

export interface LineItemInput {
  quantity: number;
  centralRate?: number;
  rate?: number;
  overrideRate?: number;
}

export interface TaxConfig {
  gstEnabled: boolean;
  isInterstate: boolean;
}

export interface InvoiceEngineTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: LineItemInput[],
  taxConfig: TaxConfig,
): InvoiceEngineTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const effectiveRate = item.overrideRate ?? item.centralRate ?? item.rate ?? 0;
      return sum + item.quantity * effectiveRate;
    }, 0),
  );

  if (!taxConfig.gstEnabled) {
    return { subtotal, cgst: 0, sgst: 0, igst: 0, total: subtotal };
  }

  if (taxConfig.isInterstate) {
    const igst = roundMoney(subtotal * 0.18);
    return { subtotal, cgst: 0, sgst: 0, igst, total: roundMoney(subtotal + igst) };
  }

  const cgst = roundMoney(subtotal * 0.09);
  const sgst = roundMoney(subtotal * 0.09);
  return {
    subtotal,
    cgst,
    sgst,
    igst: 0,
    total: roundMoney(subtotal + cgst + sgst),
  };
}

export function calendarYear(date: Date | string = new Date()) {
  if (typeof date === "string") {
    const year = Number(date.slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
  }
  return date.getFullYear();
}

export function generateInvoiceNumber(type: "CON" | "RES", year: number, sequence: number) {
  const serial = String(Math.max(0, Math.trunc(sequence))).padStart(4, "0");
  return `MI/${type}/${year}/${serial}`;
}

export function applyDocumentVersionSuffix(baseNumber: string, version: number) {
  if (version <= 0) {
    return baseNumber;
  }
  return `${baseNumber}-v${version}`;
}

export function baseDocumentNumber(displayNumber: string) {
  return displayNumber.replace(/-v\d+$/, "");
}

export function documentVersion(displayNumber: string) {
  const match = /-v(\d+)$/.exec(displayNumber);
  return match ? Number(match[1]) : 0;
}

export function documentSequence(value: string, prefix: string) {
  if (!value.startsWith(prefix)) {
    return 0;
  }
  const sequence = Number(value.slice(prefix.length).split("-v")[0]);
  return Number.isFinite(sequence) ? sequence : 0;
}
