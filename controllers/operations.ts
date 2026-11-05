"use server";

import { allowed } from "@/lib/auth/access";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/current";
import { loadSiteBook, persistSiteBook } from "@/lib/persistence/site-db";
import {
  addEquipmentLog,
  decidePayment,
  emptySiteBook,
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
  if (!(await allowed("site.read"))) return emptySiteBook();
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

export async function createEquipmentLog(log: Parameters<typeof addEquipmentLog>[1]) {
  if (!(await allowed("site.write"))) return { ok: false as const, message: "You do not have access to this." };
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(addEquipmentLog(await loadSiteBook(), log));
}

export async function createPayment(payment: Parameters<typeof requestPayment>[1]) {
  if (!(await allowed("site.write"))) return { ok: false as const, message: "You do not have access to this." };
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(requestPayment(await loadSiteBook(), payment));
}

export async function reviewPayment(paymentId: string, status: "APPROVED" | "REJECTED") {
  if (!(await allowed("approvals.review"))) return { ok: false as const, message: "You do not have access to this." };
  const session = await staffSession();
  if (!session) return { ok: false as const, message: "Sign in required." };
  return commit(decidePayment(await loadSiteBook(), paymentId, status, session.role));
}
