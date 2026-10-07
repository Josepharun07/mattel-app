import type { ResortInvoice, ResortLease, ResortPayment } from "@/lib/resort/types";

const storageKey = "mattel.resort.session";
const eventName = "mattel-resort-session";

export type ResortSession = {
  leases: ResortLease[];
  invoices: ResortInvoice[];
  payments: ResortPayment[];
};

const emptySession: ResortSession = { leases: [], invoices: [], payments: [] };
let raw = "";
let snapshot: ResortSession = emptySession;

export function readResortSession(): ResortSession {
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
    const parsed = JSON.parse(next) as ResortSession;
    snapshot = {
      leases: Array.isArray(parsed.leases) ? parsed.leases : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

export function writeResortSession(next: ResortSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

export function subscribeResortSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function serverResortSession(): ResortSession {
  return emptySession;
}
