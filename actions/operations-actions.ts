"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/current";
import { loadSiteBook, persistSiteBook } from "@/lib/persistence/site-db";
import {
  addBoqLine,
  addBudgetLine,
  addEquipmentLog,
  decidePayment,
  emptySiteBook,
  raiseRaBill,
  recordExecution,
  requestPayment,
  type SiteBook,
} from "@/lib/site/book";

async function staffSession() {
  const session = await getCurrentSession();
  if (!session || session.kind !== "staff" || !session.role) {
    return null;
  }
  return { ...session, role: session.role };
}

async function commit(result: { ok: true; book: SiteBook } | { ok: false; message: string }) {
  if (!result.ok) {
    return result;
  }
  await persistSiteBook(result.book);
  revalidatePath("/", "layout");
  return { ok: true as const, message: "Saved." };
}

export async function getSiteBook() {
  const session = await staffSession();
  if (!session) {
    return emptySiteBook();
  }
  return loadSiteBook();
}

export async function getPortalData() {
  const session = await getCurrentSession();
  if (!session || session.kind === "vendor") {
    return { bills: [] as SiteBook["raBills"] };
  }
  const book = await loadSiteBook();
  return { bills: book.raBills };
}

export async function createBoqLine(line: Parameters<typeof addBoqLine>[1]) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(addBoqLine(await loadSiteBook(), line));
}

export async function executeBoq(boqId: string, quantity: number) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(recordExecution(await loadSiteBook(), boqId, quantity));
}

export async function billBoq(boqId: string, issuedOn: string, gstEnabled: boolean) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(raiseRaBill(await loadSiteBook(), boqId, issuedOn, gstEnabled));
}

export async function createEquipmentLog(log: Parameters<typeof addEquipmentLog>[1]) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(addEquipmentLog(await loadSiteBook(), log));
}

export async function createBudgetLine(line: Parameters<typeof addBudgetLine>[1]) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(addBudgetLine(await loadSiteBook(), line));
}

export async function createPayment(payment: Parameters<typeof requestPayment>[1]) {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(requestPayment(await loadSiteBook(), payment));
}

export async function reviewPayment(paymentId: string, status: "APPROVED" | "REJECTED") {
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(decidePayment(await loadSiteBook(), paymentId, status, session.role));
}
