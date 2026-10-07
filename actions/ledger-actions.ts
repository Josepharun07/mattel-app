"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adjustStock } from "@/actions/inventory-actions";
import { clients, inventoryItems, invoices, ledgerEntries, projects } from "@/db/schema";
import { baseDocumentNumber, calculateInvoiceTotals, calendarYear, generateInvoiceNumber } from "@/lib/engines/invoice-engine";
import {
  getUnbilledLedgerRows,
  ingestProjectEvent,
  summarizeProjectLedger,
  toInvoiceLineDraft,
  type LedgerEntityType,
  type LedgerStockSource,
} from "@/lib/engines/ledger-engine";
import { buildSampleLedger, type LedgerEntryView, type ProjectLedger } from "@/lib/ledger/sample";
import { writeStockAdjustment } from "@/lib/inventory/ledger";
import { roundMoney } from "@/lib/money";
import { getNextInvoiceNumber } from "@/actions/invoice-actions";

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

function mapEntry(row: {
  id: string;
  projectId: string | null;
  clientId: string | null;
  invoiceId: string | null;
  entityType: LedgerEntityType;
  eventType: string;
  description: string;
  materialName: string;
  quantity: string;
  unitType: string;
  centralRate: string;
  overrideRate: string;
  finalPrice: string;
  totalPrice: string;
  stockSource: LedgerStockSource;
  inventoryItemId: string | null;
  vehicleNumber: string | null;
  transitPassNumber: string | null;
  ewayBillNumber: string | null;
  createdAt: Date;
  projectName: string | null;
  clientName: string | null;
}): LedgerEntryView {
  const finalPrice = Number(row.finalPrice) || Number(row.totalPrice);
  return {
    id: row.id,
    projectId: row.projectId,
    clientId: row.clientId,
    projectName: row.projectName ?? "",
    clientName: row.clientName ?? "",
    invoiceId: row.invoiceId,
    entityType: row.entityType,
    eventType: row.eventType,
    description: row.description || row.materialName,
    quantity: Number(row.quantity),
    unitType: row.unitType,
    centralRate: Number(row.centralRate),
    overrideRate: Number(row.overrideRate),
    finalPrice,
    source: row.stockSource,
    inventoryItemId: row.inventoryItemId,
    vehicleNumber: row.vehicleNumber,
    transitPassNo: row.transitPassNumber,
    ewayBillNo: row.ewayBillNumber,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProjectLedger(projectId: string): Promise<ProjectLedger> {
  const sample = buildSampleLedger(projectId);
  if (!projectId) {
    return sample;
  }
  if (!process.env.DATABASE_URL) {
    return sample;
  }

  try {
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        title: projects.title,
        clientId: projects.clientId,
        clientName: clients.name,
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));

    if (!project) {
      return sample;
    }

    const rows = await db
      .select({
        id: ledgerEntries.id,
        projectId: ledgerEntries.projectId,
        clientId: ledgerEntries.clientId,
        invoiceId: ledgerEntries.invoiceId,
        entityType: ledgerEntries.entityType,
        eventType: ledgerEntries.eventType,
        description: ledgerEntries.description,
        materialName: ledgerEntries.materialName,
        quantity: ledgerEntries.quantity,
        unitType: ledgerEntries.unitType,
        centralRate: ledgerEntries.centralRate,
        overrideRate: ledgerEntries.overrideRate,
        finalPrice: ledgerEntries.finalPrice,
        totalPrice: ledgerEntries.totalPrice,
        stockSource: ledgerEntries.stockSource,
        inventoryItemId: ledgerEntries.inventoryItemId,
        vehicleNumber: ledgerEntries.vehicleNumber,
        transitPassNumber: ledgerEntries.transitPassNumber,
        ewayBillNumber: ledgerEntries.ewayBillNumber,
        createdAt: ledgerEntries.createdAt,
        projectName: projects.name,
        clientName: clients.name,
      })
      .from(ledgerEntries)
      .leftJoin(projects, eq(projects.id, ledgerEntries.projectId))
      .leftJoin(clients, eq(clients.id, ledgerEntries.clientId))
      .where(and(eq(ledgerEntries.projectId, project.id), isNull(ledgerEntries.deletedAt)));

    return {
      project: {
        id: project.id,
        name: project.name || project.title,
        clientId: project.clientId,
        clientName: project.clientName,
      },
      entries: rows.map(mapEntry),
      offline: false,
    };
  } catch {
    return sample;
  }
}

const eventSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  entityType: z.enum(["PROJECT", "CLIENT", "PERSON"]),
  eventType: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitType: z.string().trim().min(1),
  centralRate: z.number().nonnegative(),
  overrideRate: z.number().nonnegative(),
  source: z.enum(["CENTRAL_INVENTORY", "DIRECT_PURCHASE"]),
  inventoryItemId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  transitPassNo: z.string().optional(),
  ewayBillNo: z.string().optional(),
});

export async function recordEventEntry(data: z.infer<typeof eventSchema>) {
  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the description, quantity, unit, and rates." };
  }
  const event = ingestProjectEvent(parsed.data);
  if ("error" in event) {
    return { success: false as const, message: event.error };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This event is kept in this session.",
      entry: event,
    };
  }

  if (!z.uuid().safeParse(parsed.data.projectId).success || !z.uuid().safeParse(parsed.data.clientId).success) {
    return { success: false as const, message: "Choose a saved project." };
  }
  if (event.inventoryItemId && !z.uuid().safeParse(event.inventoryItemId).success) {
    return { success: false as const, message: "Choose a saved catalog material." };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(ledgerEntries)
        .values({
          projectId: event.projectId,
          clientId: event.clientId,
          entityType: event.entityType,
          eventType: event.eventType,
          description: event.description,
          materialName: event.description,
          quantity: money(event.quantity),
          unitType: event.unitType,
          centralRate: money(event.centralRate),
          overrideRate: money(event.overrideRate),
          totalPrice: money(event.finalPrice),
          finalPrice: money(event.finalPrice),
          vehicleNumber: event.vehicleNumber,
          transitPassNumber: event.transitPassNo,
          ewayBillNumber: event.ewayBillNo,
          source: event.source,
          stockSource: event.source,
          inventoryItemId: event.inventoryItemId,
        })
        .returning({ id: ledgerEntries.id });

      if (event.deductStock && event.inventoryItemId) {
        await writeStockAdjustment(tx, {
          itemId: event.inventoryItemId,
          quantity: event.quantity,
          changeType: "MANUAL_CORRECTION",
          referenceId: row.id,
          notes: event.description,
        });
      }

      return row;
    });

    revalidatePath(`/projects/${parsed.data.projectId}/ledger`);
    revalidatePath("/inventory");
    return { success: true as const, message: "Event recorded.", id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the event.";
    return { success: false as const, message };
  }
}

export async function compileSelectedRowsToInvoice(
  selectedEntryIds: string[],
  clientDetails: { clientId: string; projectId?: string },
  taxConfig: { gstEnabled: boolean; isInterstate: boolean },
) {
  if (selectedEntryIds.length === 0 || !clientDetails.clientId) {
    return { success: false as const, message: "Select at least one unbilled row." };
  }

  const invoiceNumber = await getNextInvoiceNumber("CON");
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: `Invoice ${invoiceNumber} is ready in this session.`,
      invoiceNumber,
    };
  }

  if (selectedEntryIds.some((id) => !z.uuid().safeParse(id).success) || !z.uuid().safeParse(clientDetails.clientId).success) {
    return { success: false as const, message: "Choose saved unbilled rows." };
  }

  try {
    const rows = await db
      .select()
      .from(ledgerEntries)
      .where(and(inArray(ledgerEntries.id, selectedEntryIds), isNull(ledgerEntries.deletedAt)));
    const unbilled = getUnbilledLedgerRows(
      rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        clientId: row.clientId,
        invoiceId: row.invoiceId,
        description: row.description || row.materialName,
        quantity: Number(row.quantity),
        unitType: row.unitType,
        centralRate: Number(row.centralRate),
        overrideRate: Number(row.overrideRate),
        finalPrice: Number(row.finalPrice) || Number(row.totalPrice),
      })),
      clientDetails.projectId ?? rows[0]?.projectId ?? "",
      "PROJECT",
    );
    if (unbilled.length === 0) {
      return { success: false as const, message: "Those rows are already billed." };
    }

    const totals = calculateInvoiceTotals(
      unbilled.map((row) => ({
        quantity: row.quantity,
        centralRate: row.centralRate,
        overrideRate: row.overrideRate,
      })),
      taxConfig,
    );
    const year = calendarYear(new Date());
    const number = baseDocumentNumber(invoiceNumber || generateInvoiceNumber("CON", year, 1));

    const created = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          baseInvoiceNumber: number,
          invoiceNumber: number,
          version: 0,
          isFinalized: true,
          clientId: clientDetails.clientId,
          projectId: clientDetails.projectId,
          invoiceType: "CONSTRUCTION",
          subtotal: money(totals.subtotal),
          cgstAmount: money(totals.cgst),
          sgstAmount: money(totals.sgst),
          igstAmount: money(totals.igst),
          totalAmount: money(totals.total),
          cgst: money(totals.cgst),
          sgst: money(totals.sgst),
          igst: money(totals.igst),
          grandTotal: money(totals.total),
          letterheadMode: true,
          stationeryMode: false,
        })
        .returning({ id: invoices.id });

      await tx
        .update(ledgerEntries)
        .set({ invoiceId: invoice.id })
        .where(inArray(ledgerEntries.id, unbilled.map((row) => row.id)));

      return invoice;
    });

    revalidatePath("/invoices");
    revalidatePath("/invoices/create");
    if (clientDetails.projectId) {
      revalidatePath(`/projects/${clientDetails.projectId}/ledger`);
    }
    return {
      success: true as const,
      message: `Invoice ${number} created.`,
      invoiceNumber: number,
      invoiceId: created.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not compile the invoice.";
    return { success: false as const, message };
  }
}

const projectEventSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  entityType: z.enum(["PROJECT", "CLIENT", "PERSON"]).default("PROJECT"),
  eventType: z.enum(["MATERIAL_DRAW", "EQUIPMENT_USAGE", "TRANSIT_PASS", "SITE_ACTION"]),
  description: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitType: z.string().trim().min(1),
  centralRate: z.number().nonnegative(),
  overrideRate: z.number().nonnegative(),
  source: z.enum(["CENTRAL_INVENTORY", "DIRECT_PURCHASE"]),
  inventoryItemId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  transitPassNo: z.string().optional(),
  ewayBillNo: z.string().optional(),
});

export async function getProjectLedgerStats(projectId: string) {
  const ledger = await getProjectLedger(projectId);
  return {
    ...summarizeProjectLedger(ledger.entries),
    projectId: ledger.project.id,
    projectName: ledger.project.name,
    clientId: ledger.project.clientId,
    clientName: ledger.project.clientName,
    offline: ledger.offline,
  };
}

export async function getUnbilledProjectEntries(projectId: string) {
  const ledger = await getProjectLedger(projectId);
  return getUnbilledLedgerRows(ledger.entries, ledger.project.id, "PROJECT");
}

export async function getCompileDraft(projectId: string, entryIds: string[]) {
  const ledger = await getProjectLedger(projectId);
  const unbilled = getUnbilledLedgerRows(ledger.entries, ledger.project.id, "PROJECT");
  const chosen = unbilled.filter((row) => entryIds.includes(row.id));
  return {
    projectId: ledger.project.id,
    clientId: ledger.project.clientId,
    projectName: ledger.project.name,
    clientName: ledger.project.clientName,
    entryIds: chosen.map((row) => row.id),
    lines: chosen.map(toInvoiceLineDraft),
    transitPassNo: chosen.find((row) => row.transitPassNo)?.transitPassNo ?? "",
    ewayBillNo: chosen.find((row) => row.ewayBillNo)?.ewayBillNo ?? "",
  };
}

export async function recordProjectEvent(data: z.infer<typeof projectEventSchema>) {
  const parsed = projectEventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the material, quantity, unit, and rates." };
  }
  const event = ingestProjectEvent(parsed.data);
  if ("error" in event) {
    return { success: false as const, message: event.error };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This event is kept in this session.",
      entry: event,
    };
  }

  if (!z.uuid().safeParse(parsed.data.projectId).success || !z.uuid().safeParse(parsed.data.clientId).success) {
    return { success: false as const, message: "Choose a saved project." };
  }
  if (event.inventoryItemId && !z.uuid().safeParse(event.inventoryItemId).success) {
    return { success: false as const, message: "Choose a saved catalog material." };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(ledgerEntries)
        .values({
          projectId: event.projectId,
          clientId: event.clientId,
          entityType: event.entityType,
          eventType: event.eventType,
          description: event.description,
          materialName: event.description,
          quantity: money(event.quantity),
          unitType: event.unitType,
          centralRate: money(event.centralRate),
          overrideRate: money(event.overrideRate),
          totalPrice: money(event.finalPrice),
          finalPrice: money(event.finalPrice),
          vehicleNumber: event.vehicleNumber,
          transitPassNumber: event.transitPassNo,
          ewayBillNumber: event.ewayBillNo,
          source: event.source,
          stockSource: event.source,
          inventoryItemId: event.inventoryItemId,
        })
        .returning({ id: ledgerEntries.id });
      return row;
    });

    if (event.deductStock && event.inventoryItemId) {
      const stock = await adjustStock(
        event.inventoryItemId,
        event.quantity,
        "MANUAL_CORRECTION",
        created.id,
        event.description,
      );
      if (!stock.success) {
        return { success: false as const, message: stock.message };
      }
    }

    revalidatePath(`/projects/${parsed.data.projectId}/ledger`);
    revalidatePath("/inventory");
    return { success: true as const, message: "Event recorded.", id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the event.";
    return { success: false as const, message };
  }
}

export async function resetEntryRateToCentral(entryId: string) {
  if (!entryId) {
    return { success: false as const, message: "Choose a ledger row." };
  }
  if (!process.env.DATABASE_URL) {
    return { success: false as const, offline: true, message: "Rate reset in this session." };
  }
  if (!z.uuid().safeParse(entryId).success) {
    return { success: false as const, message: "Choose a saved ledger row." };
  }

  try {
    const [entry] = await db
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.id, entryId), isNull(ledgerEntries.deletedAt)));
    if (!entry || entry.invoiceId) {
      return { success: false as const, message: "That row is not on the unbilled book." };
    }

    let centralRate = Number(entry.centralRate);
    if (entry.inventoryItemId) {
      const [item] = await db
        .select({ centralRate: inventoryItems.centralRate })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, entry.inventoryItemId));
      if (item) {
        centralRate = Number(item.centralRate);
      }
    }
    const finalPrice = roundMoney(Number(entry.quantity) * centralRate);
    await db
      .update(ledgerEntries)
      .set({
        centralRate: money(centralRate),
        overrideRate: money(centralRate),
        totalPrice: money(finalPrice),
        finalPrice: money(finalPrice),
      })
      .where(eq(ledgerEntries.id, entry.id));

    if (entry.projectId) {
      revalidatePath(`/projects/${entry.projectId}/ledger`);
    }
    return { success: true as const, message: "Rate reset to the catalog rate.", centralRate, finalPrice };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reset the rate.";
    return { success: false as const, message };
  }
}
