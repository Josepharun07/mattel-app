import { roundMoney } from "@/lib/money";
import type { InvoiceTotals, LedgerItem, TaxMode } from "@/lib/invoicing/types";

const CGST_RATE = 0.09;
const SGST_RATE = 0.09;
const IGST_RATE = 0.18;

export function calculateInvoiceTotals(
  selectedItems: LedgerItem[],
  gstEnabled: boolean,
  taxMode: TaxMode,
): InvoiceTotals {
  const subtotal = roundMoney(
    selectedItems.reduce((sum, item) => sum + item.totalPrice, 0),
  );

  if (!gstEnabled) {
    return {
      subtotal,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grandTotal: subtotal,
    };
  }

  if (taxMode === "INTER") {
    const igst = roundMoney(subtotal * IGST_RATE);
    return {
      subtotal,
      cgst: 0,
      sgst: 0,
      igst,
      grandTotal: roundMoney(subtotal + igst),
    };
  }

  const cgst = roundMoney(subtotal * CGST_RATE);
  const sgst = roundMoney(subtotal * SGST_RATE);

  return {
    subtotal,
    cgst,
    sgst,
    igst: 0,
    grandTotal: roundMoney(subtotal + cgst + sgst),
  };
}
