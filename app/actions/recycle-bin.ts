"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  assets,
  centralInventory,
  clients,
  invoices,
  ledgerEntries,
  projects,
  subcontracts,
} from "@/lib/db/schema";

const restorables = [
  "clients",
  "projects",
  "central_inventory",
  "invoices",
  "ledger_entries",
  "assets",
  "subcontracts",
] as const;

const restoreSchema = z.object({
  table: z.enum(restorables),
  recordId: z.uuid(),
});

export async function restoreSoftDeletedRecord(
  table: string,
  recordId: string,
): Promise<{ success: boolean; message: string }> {
  const parsed = restoreSchema.safeParse({ table, recordId });
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a soft-delete table and a valid record id.",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      message:
        "DATABASE_URL is not configured. The restore action is registered and will clear deleted_at once PostgreSQL is connected.",
    };
  }

  const db = getDb();
  const id = parsed.data.recordId;
  let restored: { id: string }[] = [];

  switch (parsed.data.table) {
    case "clients":
      restored = await db
        .update(clients)
        .set({ deletedAt: null })
        .where(eq(clients.id, id))
        .returning({ id: clients.id });
      break;
    case "projects":
      restored = await db
        .update(projects)
        .set({ deletedAt: null })
        .where(eq(projects.id, id))
        .returning({ id: projects.id });
      break;
    case "central_inventory":
      restored = await db
        .update(centralInventory)
        .set({ deletedAt: null })
        .where(eq(centralInventory.id, id))
        .returning({ id: centralInventory.id });
      break;
    case "invoices":
      restored = await db
        .update(invoices)
        .set({ deletedAt: null })
        .where(eq(invoices.id, id))
        .returning({ id: invoices.id });
      break;
    case "ledger_entries":
      restored = await db
        .update(ledgerEntries)
        .set({ deletedAt: null })
        .where(eq(ledgerEntries.id, id))
        .returning({ id: ledgerEntries.id });
      break;
    case "assets":
      restored = await db
        .update(assets)
        .set({ deletedAt: null })
        .where(eq(assets.id, id))
        .returning({ id: assets.id });
      break;
    case "subcontracts":
      restored = await db
        .update(subcontracts)
        .set({ deletedAt: null })
        .where(eq(subcontracts.id, id))
        .returning({ id: subcontracts.id });
      break;
  }

  if (restored.length === 0) {
    return {
      success: false,
      message: "No archived record matched that id.",
    };
  }

  return {
    success: true,
    message: "Archived record restored.",
  };
}

export async function purgeSoftDeletedRecord(
  table: string,
  recordId: string,
  actorRole: string,
): Promise<{ success: boolean; message: string }> {
  const parsed = restoreSchema
    .extend({ actorRole: z.literal("SUPER_ADMIN") })
    .safeParse({ table, recordId, actorRole });

  if (actorRole !== "SUPER_ADMIN") {
    return {
      success: false,
      message: "Only a Super Admin can permanently purge records.",
    };
  }

  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a soft-delete table and a valid record id.",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      message:
        "DATABASE_URL is not configured. The purge action is registered and will hard-delete the row once PostgreSQL is connected.",
    };
  }

  const db = getDb();
  const id = parsed.data.recordId;
  let removed: { id: string }[] = [];

  switch (parsed.data.table) {
    case "clients":
      removed = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
      break;
    case "projects":
      removed = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
      break;
    case "central_inventory":
      removed = await db
        .delete(centralInventory)
        .where(eq(centralInventory.id, id))
        .returning({ id: centralInventory.id });
      break;
    case "invoices":
      removed = await db.delete(invoices).where(eq(invoices.id, id)).returning({ id: invoices.id });
      break;
    case "ledger_entries":
      removed = await db
        .delete(ledgerEntries)
        .where(eq(ledgerEntries.id, id))
        .returning({ id: ledgerEntries.id });
      break;
    case "assets":
      removed = await db.delete(assets).where(eq(assets.id, id)).returning({ id: assets.id });
      break;
    case "subcontracts":
      removed = await db
        .delete(subcontracts)
        .where(eq(subcontracts.id, id))
        .returning({ id: subcontracts.id });
      break;
  }

  if (removed.length === 0) {
    return { success: false, message: "No archived record matched that id." };
  }

  return { success: true, message: "Record permanently purged." };
}
