import { roundMoney } from "@/lib/money";

export type LedgerEntityType = "PROJECT" | "CLIENT" | "PERSON";
export type LedgerStockSource = "CENTRAL_INVENTORY" | "DIRECT_PURCHASE";

export interface LedgerEventInput {
  projectId?: string | null;
  clientId?: string | null;
  entityType: LedgerEntityType;
  eventType: string;
  description: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  source: LedgerStockSource;
  inventoryItemId?: string | null;
  vehicleNumber?: string | null;
  transitPassNo?: string | null;
  ewayBillNo?: string | null;
}

export interface LedgerEventRow {
  projectId: string | null;
  clientId: string | null;
  entityType: LedgerEntityType;
  eventType: string;
  description: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  finalPrice: number;
  source: LedgerStockSource;
  inventoryItemId: string | null;
  vehicleNumber: string | null;
  transitPassNo: string | null;
  ewayBillNo: string | null;
  deductStock: boolean;
}

export interface UnbilledLedgerRow {
  id: string;
  projectId: string | null;
  clientId: string | null;
  invoiceId: string | null;
  deletedAt?: string | null;
  entityType?: LedgerEntityType;
  description: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  finalPrice: number;
}

export function finalEventPrice(quantity: number, overrideRate: number) {
  return roundMoney(quantity * overrideRate);
}

export function ingestProjectEvent(payload: LedgerEventInput): LedgerEventRow | { error: string } {
  const description = payload.description.trim();
  const eventType = payload.eventType.trim();
  const unitType = payload.unitType.trim();
  if (!description || !eventType || !unitType) {
    return { error: "Enter the event, unit, and description." };
  }
  if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
    return { error: "Quantity must be greater than zero." };
  }
  if (payload.centralRate < 0 || payload.overrideRate < 0) {
    return { error: "Rates cannot be negative." };
  }
  if (payload.source === "CENTRAL_INVENTORY" && !payload.inventoryItemId) {
    return { error: "Choose a catalog material for a central-inventory draw." };
  }

  const finalPrice = finalEventPrice(payload.quantity, payload.overrideRate);
  return {
    projectId: payload.projectId ?? null,
    clientId: payload.clientId ?? null,
    entityType: payload.entityType,
    eventType,
    description,
    quantity: payload.quantity,
    unitType,
    centralRate: roundMoney(payload.centralRate),
    overrideRate: roundMoney(payload.overrideRate),
    finalPrice,
    source: payload.source,
    inventoryItemId: payload.inventoryItemId ?? null,
    vehicleNumber: payload.vehicleNumber?.trim() || null,
    transitPassNo: payload.transitPassNo?.trim() || null,
    ewayBillNo: payload.ewayBillNo?.trim() || null,
    deductStock: payload.source === "CENTRAL_INVENTORY",
  };
}

export function getUnbilledLedgerRows<T extends UnbilledLedgerRow>(
  rows: T[],
  targetId: string,
  targetType: "PROJECT" | "CLIENT",
): T[] {
  return rows.filter((row) => {
    if (row.deletedAt || row.invoiceId) {
      return false;
    }
    if (targetType === "PROJECT") {
      return row.projectId === targetId;
    }
    return row.clientId === targetId;
  });
}

export interface ProjectLedgerStats {
  unbilledValue: number;
  billedValue: number;
  pendingMaterialDraws: number;
  activeEventCount: number;
  latestActivity: string | null;
}

export function resetRateToCentral(quantity: number, centralRate: number) {
  const rate = roundMoney(centralRate);
  return {
    centralRate: rate,
    overrideRate: rate,
    finalPrice: finalEventPrice(quantity, rate),
  };
}

export function summarizeProjectLedger(
  rows: Array<{
    invoiceId: string | null;
    deletedAt?: string | null;
    eventType: string;
    finalPrice: number;
    createdAt: string;
  }>,
): ProjectLedgerStats {
  const active = rows.filter((row) => !row.deletedAt);
  const unbilled = active.filter((row) => !row.invoiceId);
  const billed = active.filter((row) => row.invoiceId);
  const latest = active.map((row) => row.createdAt).sort().at(-1) ?? null;
  return {
    unbilledValue: roundMoney(unbilled.reduce((sum, row) => sum + row.finalPrice, 0)),
    billedValue: roundMoney(billed.reduce((sum, row) => sum + row.finalPrice, 0)),
    pendingMaterialDraws: unbilled.filter((row) => row.eventType === "MATERIAL_DRAW").length,
    activeEventCount: unbilled.length,
    latestActivity: latest,
  };
}

export function selectedUnbilledValue(rows: Array<{ id: string; finalPrice: number }>, selectedIds: string[]) {
  const chosen = new Set(selectedIds);
  return roundMoney(rows.filter((row) => chosen.has(row.id)).reduce((sum, row) => sum + row.finalPrice, 0));
}

export function compileInvoiceHref(projectId: string, entryIds: string[]) {
  const params = new URLSearchParams({
    projectId,
    entryIds: entryIds.join(","),
  });
  return `/invoices/create?${params.toString()}`;
}

export function toInvoiceLineDraft(row: {
  id: string;
  description: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  inventoryItemId?: string | null;
}) {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId ?? "",
    name: row.description,
    quantity: String(row.quantity),
    unitType: row.unitType,
    centralRate: row.centralRate,
    overrideRate: String(row.overrideRate),
  };
}
