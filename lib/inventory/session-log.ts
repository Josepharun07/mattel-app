import type { StockLogRow } from "@/actions/inventory-actions";

const storageKey = "mattel.inventory.stock-logs";

export function readSessionStockLogs(): StockLogRow[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]") as StockLogRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendSessionStockLog(row: StockLogRow) {
  const next = [row, ...readSessionStockLogs()];
  sessionStorage.setItem(storageKey, JSON.stringify(next));
}
