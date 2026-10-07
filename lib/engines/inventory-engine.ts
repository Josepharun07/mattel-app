import { roundMoney } from "@/lib/money";

export interface StockProjection {
  remaining: number;
  issued: number;
  lowStock: boolean;
}

export function deductInventory(
  currentStock: number,
  quantityIssued: number,
  lowStockThreshold: number,
): StockProjection {
  const issued = roundMoney(Math.max(0, quantityIssued));
  const remaining = roundMoney(currentStock - issued);

  return {
    remaining,
    issued,
    lowStock: remaining <= lowStockThreshold,
  };
}

export function isLowStockTrigger(currentStock: number, lowStockThreshold: number): boolean {
  return currentStock <= lowStockThreshold;
}

export type StockChangeType =
  | "INBOUND_PURCHASE"
  | "OUTBOUND_INVOICE"
  | "MANUAL_CORRECTION"
  | "RETURN";

export interface StockProjectionResult {
  previousStock: number;
  quantity: number;
  newStock: number;
  permitted: boolean;
  warning: boolean;
  lowStock: boolean;
  direction: "IN" | "OUT";
}

export function addsStock(changeType: StockChangeType) {
  return changeType === "INBOUND_PURCHASE" || changeType === "RETURN";
}

export function projectStockLevel(
  currentStock: number,
  quantity: number,
  changeType: StockChangeType,
  lowStockThreshold: number,
  allowNegative = false,
): StockProjectionResult {
  const amount = roundMoney(Math.abs(quantity));
  const adding = addsStock(changeType);
  const next = roundMoney(adding ? currentStock + amount : currentStock - amount);
  const warning = next < 0;
  const permitted = adding || allowNegative || !warning;

  return {
    previousStock: roundMoney(currentStock),
    quantity: amount,
    newStock: permitted ? next : roundMoney(currentStock),
    permitted,
    warning,
    lowStock: isLowStockTrigger(permitted ? next : currentStock, lowStockThreshold),
    direction: adding ? "IN" : "OUT",
  };
}
