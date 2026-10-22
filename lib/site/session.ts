"use client";

import { useSyncExternalStore } from "react";
import type { AccessRole } from "@/lib/settings/appearance";
import {
  addBoqLine,
  addBudgetLine,
  addDiary,
  addDrawing,
  addEquipmentLog,
  addIncident,
  addPurchaseOrder,
  addRfi,
  addSubmittal,
  addToolboxTalk,
  answerRfi,
  decideLeave,
  decidePayment,
  issueMaterial,
  raiseRaBill,
  receiveGoods,
  recordExecution,
  requestLeave,
  requestPayment,
  reviseDrawing,
  saveWageDeduction,
  seedSiteBook,
  setSubmittalStatus,
  type SiteBook,
  type Submittal,
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
  addDiary: (entry: Parameters<typeof addDiary>[1]) => apply(addDiary(read(), entry)),
  addBoqLine: (line: Parameters<typeof addBoqLine>[1]) => apply(addBoqLine(read(), line)),
  recordExecution: (boqId: string, quantity: number) => apply(recordExecution(read(), boqId, quantity)),
  raiseRaBill: (boqId: string, issuedOn: string, gstEnabled: boolean) => apply(raiseRaBill(read(), boqId, issuedOn, gstEnabled)),
  addPurchaseOrder: (order: Parameters<typeof addPurchaseOrder>[1]) => apply(addPurchaseOrder(read(), order)),
  receiveGoods: (orderId: string, quantity: number, receivedOn: string) => apply(receiveGoods(read(), orderId, quantity, receivedOn)),
  issueMaterial: (issue: Parameters<typeof issueMaterial>[1]) => apply(issueMaterial(read(), issue)),
  addEquipmentLog: (log: Parameters<typeof addEquipmentLog>[1]) => apply(addEquipmentLog(read(), log)),
  addBudgetLine: (line: Parameters<typeof addBudgetLine>[1]) => apply(addBudgetLine(read(), line)),
  addDrawing: (drawing: Parameters<typeof addDrawing>[1]) => apply(addDrawing(read(), drawing)),
  reviseDrawing: (drawingId: string, revisedOn: string) => apply(reviseDrawing(read(), drawingId, revisedOn)),
  addRfi: (question: string, askedOn: string) => apply(addRfi(read(), question, askedOn)),
  answerRfi: (rfiId: string, answer: string) => apply(answerRfi(read(), rfiId, answer)),
  addSubmittal: (title: string, specSection: string) => apply(addSubmittal(read(), title, specSection)),
  setSubmittalStatus: (submittalId: string, status: Submittal["status"]) => apply(setSubmittalStatus(read(), submittalId, status)),
  addToolboxTalk: (talk: Parameters<typeof addToolboxTalk>[1]) => apply(addToolboxTalk(read(), talk)),
  addIncident: (incident: Parameters<typeof addIncident>[1]) => apply(addIncident(read(), incident)),
  requestLeave: (leave: Parameters<typeof requestLeave>[1]) => apply(requestLeave(read(), leave)),
  decideLeave: (leaveId: string, status: "APPROVED" | "REJECTED", actor: AccessRole) => apply(decideLeave(read(), leaveId, status, actor)),
  saveWageDeduction: (staffName: string, period: string, gross: number, tdsPercent: number) =>
    apply(saveWageDeduction(read(), staffName, period, gross, tdsPercent)),
  requestPayment: (payment: Parameters<typeof requestPayment>[1]) => apply(requestPayment(read(), payment)),
  decidePayment: (paymentId: string, status: "APPROVED" | "REJECTED", actor: AccessRole) =>
    apply(decidePayment(read(), paymentId, status, actor)),
};
