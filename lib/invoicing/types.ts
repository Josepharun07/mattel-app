export type TaxMode = "INTRA" | "INTER";

export type InvoiceKind = "CONSTRUCTION" | "RESORT";

export type LedgerItem = {
  id: string;
  materialName: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  totalPrice: number;
};

export type InvoiceTotals = {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
};

export type DraftLine = {
  id: string;
  selected: boolean;
  materialName: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
};
