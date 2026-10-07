import type { AdvanceRow, AttendanceCell, SettlementRow } from "@/lib/payroll/types";

const storageKey = "mattel.payroll.session";
const eventName = "mattel-payroll-session";

export type PayrollSession = {
  cells: AttendanceCell[];
  settlements: SettlementRow[];
  advances: AdvanceRow[];
};

const emptySession: PayrollSession = { cells: [], settlements: [], advances: [] };
let raw = "";
let snapshot: PayrollSession = emptySession;

export function readPayrollSession(): PayrollSession {
  if (typeof window === "undefined") {
    return emptySession;
  }
  const next = sessionStorage.getItem(storageKey) ?? "";
  if (next === raw) {
    return snapshot;
  }
  raw = next;
  if (!next) {
    snapshot = emptySession;
    return snapshot;
  }
  try {
    const parsed = JSON.parse(next) as PayrollSession;
    snapshot = {
      cells: Array.isArray(parsed.cells) ? parsed.cells : [],
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : [],
      advances: Array.isArray(parsed.advances) ? parsed.advances : [],
    };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

export function writePayrollSession(next: PayrollSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

export function subscribePayrollSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function serverPayrollSession(): PayrollSession {
  return emptySession;
}
