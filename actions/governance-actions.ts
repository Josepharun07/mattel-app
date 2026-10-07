"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  assetRentals,
  clients,
  inventoryItems,
  invoices,
  ledgerEntries,
  projects,
  resortLeases,
  staff,
  subcontracts,
} from "@/db/schema";
import {
  confirmationMatches,
  isGovernanceEntityType,
  parentRestoreIds,
  recordsOlderThan,
  type DeletedEntity,
  type GovernanceEntityType,
} from "@/lib/engines/governance-engine";
import { buildSampleDeleted } from "@/lib/governance/sample";

const originPaths: Record<GovernanceEntityType, string[]> = {
  clients: ["/"],
  projects: ["/"],
  invoices: ["/invoices", "/invoices/create"],
  ledger_entries: ["/invoices"],
  inventory_items: ["/inventory"],
  asset_rentals: ["/rentals"],
  staff: ["/payroll"],
  subcontracts: ["/subcontracts"],
  resort_leases: ["/resort-rental"],
};

function refresh(entityType?: GovernanceEntityType) {
  revalidatePath("/settings/recycle-bin");
  if (!entityType) {
    return;
  }
  for (const path of originPaths[entityType]) {
    revalidatePath(path);
  }
}

function row(
  id: string,
  entityType: GovernanceEntityType,
  nameOrTitle: string,
  deletedAt: Date | null,
  details: string,
  parentId: string | null = null,
  parentType: GovernanceEntityType | null = null,
): DeletedEntity | null {
  if (!deletedAt) {
    return null;
  }
  return {
    id,
    entityType,
    nameOrTitle,
    deletedAt: deletedAt.toISOString(),
    details,
    parentId,
    parentType,
  };
}

export async function getSoftDeletedEntities(entityTypeFilter?: string): Promise<{
  rows: DeletedEntity[];
  offline: boolean;
}> {
  const filter = entityTypeFilter && isGovernanceEntityType(entityTypeFilter) ? entityTypeFilter : null;
  if (!process.env.DATABASE_URL) {
    const rows = buildSampleDeleted(new Date()).filter((item) => !filter || item.entityType === filter);
    return { rows, offline: true };
  }

  try {
    const [
      clientRows,
      projectRows,
      invoiceRows,
      ledgerRows,
      itemRows,
      rentalRows,
      staffRows,
      subcontractRows,
      leaseRows,
    ] = await Promise.all([
      db.select().from(clients).where(isNotNull(clients.deletedAt)),
      db.select().from(projects).where(isNotNull(projects.deletedAt)),
      db.select().from(invoices).where(isNotNull(invoices.deletedAt)),
      db.select().from(ledgerEntries).where(isNotNull(ledgerEntries.deletedAt)),
      db.select().from(inventoryItems).where(isNotNull(inventoryItems.deletedAt)),
      db.select().from(assetRentals).where(isNotNull(assetRentals.deletedAt)),
      db.select().from(staff).where(isNotNull(staff.deletedAt)),
      db.select().from(subcontracts).where(isNotNull(subcontracts.deletedAt)),
      db.select().from(resortLeases).where(isNotNull(resortLeases.deletedAt)),
    ]);

    const rows = [
      ...clientRows.map((item) => row(item.id, "clients", item.name, item.deletedAt, item.phone)),
      ...projectRows.map((item) =>
        row(item.id, "projects", item.name || item.title, item.deletedAt, item.location ?? "", item.clientId, "clients"),
      ),
      ...invoiceRows.map((item) =>
        row(item.id, "invoices", item.invoiceNumber, item.deletedAt, item.invoiceType, item.clientId, "clients"),
      ),
      ...ledgerRows.map((item) =>
        row(item.id, "ledger_entries", item.description || item.materialName, item.deletedAt, item.eventType, item.projectId, "projects"),
      ),
      ...itemRows.map((item) => row(item.id, "inventory_items", item.name, item.deletedAt, item.unitType)),
      ...rentalRows.map((item) => row(item.id, "asset_rentals", item.assetName, item.deletedAt, item.borrowerName)),
      ...staffRows.map((item) => row(item.id, "staff", item.fullName, item.deletedAt, item.role)),
      ...subcontractRows.map((item) =>
        row(item.id, "subcontracts", item.title, item.deletedAt, item.externalLeadName ?? ""),
      ),
      ...leaseRows.map((item) => row(item.id, "resort_leases", item.propertyName, item.deletedAt, item.operatorName)),
    ].filter((item): item is DeletedEntity => item !== null);

    return { rows: rows.filter((item) => !filter || item.entityType === filter), offline: false };
  } catch {
    const rows = buildSampleDeleted(new Date()).filter((item) => !filter || item.entityType === filter);
    return { rows, offline: true };
  }
}

export async function restoreEntity(entityType: string, id: string) {
  if (!isGovernanceEntityType(entityType) || !id) {
    return { success: false as const, message: "Choose an archived record." };
  }
  if (!process.env.DATABASE_URL) {
    const sample = buildSampleDeleted(new Date());
    const target = sample.find((item) => item.id === id && item.entityType === entityType);
    const parentIds = target ? parentRestoreIds(target, sample) : [];
    return {
      success: false as const,
      offline: true as const,
      message: parentIds.length
        ? "Record restored in this session. The parent client was restored with it."
        : "Record restored in this session.",
      parentIds,
    };
  }
  if (!z.uuid().safeParse(id).success) {
    return { success: false as const, message: "Choose a saved record." };
  }

  try {
    let parentIds: string[] = [];
    await db.transaction(async (tx) => {
      if (entityType === "projects") {
        const [project] = await tx.select().from(projects).where(eq(projects.id, id));
        if (project) {
          const [client] = await tx.select().from(clients).where(eq(clients.id, project.clientId));
          if (client?.deletedAt) {
            await tx.update(clients).set({ deletedAt: null }).where(eq(clients.id, client.id));
            parentIds = [client.id];
          }
        }
        await tx.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
        return;
      }
      const cleared = { deletedAt: null };
      if (entityType === "clients") await tx.update(clients).set(cleared).where(eq(clients.id, id));
      if (entityType === "invoices") await tx.update(invoices).set(cleared).where(eq(invoices.id, id));
      if (entityType === "ledger_entries") await tx.update(ledgerEntries).set(cleared).where(eq(ledgerEntries.id, id));
      if (entityType === "inventory_items") await tx.update(inventoryItems).set(cleared).where(eq(inventoryItems.id, id));
      if (entityType === "asset_rentals") await tx.update(assetRentals).set(cleared).where(eq(assetRentals.id, id));
      if (entityType === "staff") await tx.update(staff).set(cleared).where(eq(staff.id, id));
      if (entityType === "subcontracts") await tx.update(subcontracts).set(cleared).where(eq(subcontracts.id, id));
      if (entityType === "resort_leases") await tx.update(resortLeases).set(cleared).where(eq(resortLeases.id, id));
    });
    refresh(entityType);
    if (parentIds.length) {
      refresh("clients");
    }
    return {
      success: true as const,
      message: parentIds.length ? "Record restored. The parent client was restored with it." : "Record restored.",
      parentIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not restore the record.";
    return { success: false as const, message };
  }
}

async function hardDelete(entityType: GovernanceEntityType, id: string) {
  await db.transaction(async (tx) => {
    if (entityType === "clients") {
      await tx.delete(invoices).where(eq(invoices.clientId, id));
      await tx.delete(clients).where(and(eq(clients.id, id), isNotNull(clients.deletedAt)));
      return;
    }
    if (entityType === "projects") {
      await tx.delete(projects).where(and(eq(projects.id, id), isNotNull(projects.deletedAt)));
      return;
    }
    if (entityType === "invoices") {
      await tx.delete(invoices).where(and(eq(invoices.id, id), isNotNull(invoices.deletedAt)));
      return;
    }
    if (entityType === "ledger_entries") {
      await tx.delete(ledgerEntries).where(and(eq(ledgerEntries.id, id), isNotNull(ledgerEntries.deletedAt)));
      return;
    }
    if (entityType === "inventory_items") {
      await tx.delete(inventoryItems).where(and(eq(inventoryItems.id, id), isNotNull(inventoryItems.deletedAt)));
      return;
    }
    if (entityType === "asset_rentals") {
      await tx.delete(assetRentals).where(and(eq(assetRentals.id, id), isNotNull(assetRentals.deletedAt)));
      return;
    }
    if (entityType === "staff") {
      await tx.delete(staff).where(and(eq(staff.id, id), isNotNull(staff.deletedAt)));
      return;
    }
    if (entityType === "subcontracts") {
      await tx.delete(subcontracts).where(and(eq(subcontracts.id, id), isNotNull(subcontracts.deletedAt)));
      return;
    }
    await tx.delete(resortLeases).where(and(eq(resortLeases.id, id), isNotNull(resortLeases.deletedAt)));
  });
}

export async function purgeEntityPermanently(entityType: string, id: string, confirmationText: string) {
  if (!confirmationMatches(confirmationText)) {
    return { success: false as const, message: "Type PERMANENTLY DELETE to confirm." };
  }
  if (!isGovernanceEntityType(entityType) || !id) {
    return { success: false as const, message: "Choose an archived record." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true as const,
      message: "Record permanently removed from this session.",
    };
  }
  if (!z.uuid().safeParse(id).success) {
    return { success: false as const, message: "Choose a saved record." };
  }

  try {
    await hardDelete(entityType, id);
    refresh(entityType);
    return { success: true as const, message: "Record permanently deleted." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the record.";
    return { success: false as const, message };
  }
}

export async function purgeAllOldRecords(daysThreshold: number, confirmationText: string) {
  if (!confirmationMatches(confirmationText)) {
    return { success: false as const, message: "Type PERMANENTLY DELETE to confirm." };
  }
  if (!Number.isFinite(daysThreshold) || daysThreshold < 1) {
    return { success: false as const, message: "Choose a threshold of at least one day." };
  }
  if (!process.env.DATABASE_URL) {
    const ids = recordsOlderThan(buildSampleDeleted(new Date()), daysThreshold, new Date()).map((item) => item.id);
    return {
      success: false as const,
      offline: true as const,
      message: `Removed ${ids.length} records older than ${daysThreshold} days from this session.`,
      ids,
    };
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysThreshold);
    const groups = await Promise.all([
      db.select({ id: clients.id }).from(clients).where(and(isNotNull(clients.deletedAt), lt(clients.deletedAt, cutoff))),
      db.select({ id: projects.id }).from(projects).where(and(isNotNull(projects.deletedAt), lt(projects.deletedAt, cutoff))),
      db.select({ id: invoices.id }).from(invoices).where(and(isNotNull(invoices.deletedAt), lt(invoices.deletedAt, cutoff))),
      db.select({ id: ledgerEntries.id }).from(ledgerEntries).where(and(isNotNull(ledgerEntries.deletedAt), lt(ledgerEntries.deletedAt, cutoff))),
      db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(isNotNull(inventoryItems.deletedAt), lt(inventoryItems.deletedAt, cutoff))),
      db.select({ id: assetRentals.id }).from(assetRentals).where(and(isNotNull(assetRentals.deletedAt), lt(assetRentals.deletedAt, cutoff))),
      db.select({ id: staff.id }).from(staff).where(and(isNotNull(staff.deletedAt), lt(staff.deletedAt, cutoff))),
      db.select({ id: subcontracts.id }).from(subcontracts).where(and(isNotNull(subcontracts.deletedAt), lt(subcontracts.deletedAt, cutoff))),
      db.select({ id: resortLeases.id }).from(resortLeases).where(and(isNotNull(resortLeases.deletedAt), lt(resortLeases.deletedAt, cutoff))),
    ]);
    const types: GovernanceEntityType[] = [
      "clients",
      "projects",
      "invoices",
      "ledger_entries",
      "inventory_items",
      "asset_rentals",
      "staff",
      "subcontracts",
      "resort_leases",
    ];
    for (const [index, group] of groups.entries()) {
      for (const item of group) {
        await hardDelete(types[index], item.id);
      }
    }
    refresh();
    const count = groups.reduce((sum, group) => sum + group.length, 0);
    return { success: true as const, message: `Permanently deleted ${count} records older than ${daysThreshold} days.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not purge the old records.";
    return { success: false as const, message };
  }
}
