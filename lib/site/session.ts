"use client";

import { useSyncExternalStore } from "react";
import type { AccessRole } from "@/lib/settings/appearance";
import {
  addBoqLine,
  addBudgetLine,
  addEquipmentLog,
  decidePayment,
  raiseRaBill,
  recordExecution,
  requestPayment,
  seedSiteBook,
  type SiteBook,
} from "@/lib/site/book";

const storageKey = "mattel.site.book.v1";
const eventName = "mattel-site-book";
const serverBook = seedSiteBook();
let snapshot: SiteBook = serverBook;
let hydrated = false;

function read(): SiteBook {
  if (typeof window === "undefined") {
    return serverBook;
  }
  if (!hydrated) {
    hydrated = true;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        snapshot = { ...seedSiteBook(), ...(JSON.parse(raw) as Partial<SiteBook>) };
      } catch {
        snapshot = seedSiteBook();
      }
    }
  }
  return snapshot;
}

function commit(next: SiteBook) {
  snapshot = next;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(eventName));
}

function subscribe(onStoreChange: () => void) {
  const notify = () => onStoreChange();
  window.addEventListener(eventName, notify);
  return () => window.removeEventListener(eventName, notify);
}

export function useSiteBook() {
  return useSyncExternalStore(subscribe, read, () => serverBook);
}

function apply(result: { ok: true; book: SiteBook } | { ok: false; message: string }) {
  if (result.ok) {
    commit(result.book);
  }
  return result;
}

export const siteActions = {
  addBoqLine: (line: Parameters<typeof addBoqLine>[1]) => apply(addBoqLine(read(), line)),
  recordExecution: (boqId: string, quantity: number) => apply(recordExecution(read(), boqId, quantity)),
  raiseRaBill: (boqId: string, issuedOn: string, gstEnabled: boolean) => apply(raiseRaBill(read(), boqId, issuedOn, gstEnabled)),
  addEquipmentLog: (log: Parameters<typeof addEquipmentLog>[1]) => apply(addEquipmentLog(read(), log)),
  addBudgetLine: (line: Parameters<typeof addBudgetLine>[1]) => apply(addBudgetLine(read(), line)),
  requestPayment: (payment: Parameters<typeof requestPayment>[1]) => apply(requestPayment(read(), payment)),
  decidePayment: (paymentId: string, status: "APPROVED" | "REJECTED", actor: AccessRole) =>
    apply(decidePayment(read(), paymentId, status, actor)),
};
