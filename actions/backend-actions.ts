"use server";

import { revalidatePath } from "next/cache";
import { eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  assetAssignments,
  assetRentals,
  assets,
  attendanceLogs,
  centralInventory,
  clients,
  deliveryLedger,
  inventoryItems,
  invoicePayments,
  invoices,
  ledgerEntries,
  payrollSlips,
  projects,
  staff,
  stockMovements,
  subcontractDraws,
  subcontracts,
  systemSettings,
} from "@/db/schema";
import { calculateInvoiceTotals } from "@/lib/engines/invoice-engine";
import { deductInventory } from "@/lib/engines/inventory-engine";
import { roundMoney } from "@/lib/money";
import { createPresignedUploadUrl } from "@/lib/storage/s3";

type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

function unavailable(): ActionResult<never> {
  return {
    success: false,
    message: "DATABASE_URL is not configured. Connect PostgreSQL and run this action again.",
  };
}

function refreshWorkspace() {
  revalidatePath("/clients");
  revalidatePath("/invoices/create");
  revalidatePath("/inventory");
  revalidatePath("/assets");
  revalidatePath("/payroll");
  revalidatePath("/settings/recycle-bin");
}

const clientInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
});

export async function getActiveClients() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  return db.select().from(clients).where(isNull(clients.deletedAt));
}

export async function createClient(input: z.infer<typeof clientInput>): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = clientInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter a client name before saving." };
  }

  const [created] = await db
    .insert(clients)
    .values({
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? "",
      address: parsed.data.address,
      gstin: parsed.data.gstin,
    })
    .returning({ id: clients.id });

  refreshWorkspace();
  return { success: true, message: "Client saved.", data: created };
}

export async function updateClient(
  id: string,
  input: z.infer<typeof clientInput>,
): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = clientInput.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(id).success) {
    return { success: false, message: "Enter a valid client before saving." };
  }

  const updated = await db
    .update(clients)
    .set({
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? "",
      address: parsed.data.address,
      gstin: parsed.data.gstin,
    })
    .where(eq(clients.id, id))
    .returning({ id: clients.id });

  if (updated.length === 0) {
    return { success: false, message: "Client was not found." };
  }

  refreshWorkspace();
  return { success: true, message: "Client updated." };
}

export async function softDeleteClient(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
  refreshWorkspace();
  return { success: true, message: "Client moved to the recycle bin." };
}

export async function restoreClient(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(clients).set({ deletedAt: null }).where(eq(clients.id, id));
  refreshWorkspace();
  return { success: true, message: "Client restored." };
}

const projectInput = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(1),
  location: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export async function getActiveProjects() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  return db.select().from(projects).where(isNull(projects.deletedAt));
}

export async function createProject(input: z.infer<typeof projectInput>): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = projectInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Choose a client and enter a project name." };
  }

  const [created] = await db
    .insert(projects)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      title: parsed.data.name,
      location: parsed.data.location,
      status: parsed.data.status ?? "ACTIVE",
    })
    .returning({ id: projects.id });

  refreshWorkspace();
  return { success: true, message: "Project saved.", data: created };
}

export async function softDeleteProject(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
  refreshWorkspace();
  return { success: true, message: "Project moved to the recycle bin." };
}

export async function restoreProject(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
  refreshWorkspace();
  return { success: true, message: "Project restored." };
}

const invoiceInput = z.object({
  invoiceNumber: z.string().trim().min(1),
  clientId: z.uuid(),
  projectId: z.uuid().optional(),
  invoiceType: z.enum(["CONSTRUCTION", "RESORT"]).optional(),
  items: z
    .array(
      z.object({
        quantity: z.number().positive(),
        rate: z.number().nonnegative(),
        overrideRate: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
  gstEnabled: z.boolean(),
  isInterstate: z.boolean(),
  transitPassNo: z.string().trim().optional(),
  ewayBillNo: z.string().trim().optional(),
  letterheadMode: z.boolean().optional(),
});

export async function createInvoice(input: z.infer<typeof invoiceInput>): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = invoiceInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Complete the invoice number, client, and line items." };
  }

  const totals = calculateInvoiceTotals(parsed.data.items, {
    gstEnabled: parsed.data.gstEnabled,
    isInterstate: parsed.data.isInterstate,
  });
  const letterheadMode = parsed.data.letterheadMode ?? true;

  const [created] = await db
    .insert(invoices)
    .values({
      baseInvoiceNumber: parsed.data.invoiceNumber.replace(/-v\d+$/, ""),
      invoiceNumber: parsed.data.invoiceNumber.replace(/-v\d+$/, ""),
      version: 0,
      isFinalized: true,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      invoiceType: parsed.data.invoiceType ?? "CONSTRUCTION",
      subtotal: money(totals.subtotal),
      cgstAmount: money(totals.cgst),
      sgstAmount: money(totals.sgst),
      igstAmount: money(totals.igst),
      totalAmount: money(totals.total),
      cgst: money(totals.cgst),
      sgst: money(totals.sgst),
      igst: money(totals.igst),
      grandTotal: money(totals.total),
      transitPassNo: parsed.data.transitPassNo,
      ewayBillNo: parsed.data.ewayBillNo,
      letterheadMode,
      stationeryMode: !letterheadMode,
    })
    .returning({ id: invoices.id });

  refreshWorkspace();
  return { success: true, message: "Invoice saved.", data: created };
}

export async function softDeleteInvoice(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(invoices).set({ deletedAt: new Date() }).where(eq(invoices.id, id));
  refreshWorkspace();
  return { success: true, message: "Invoice moved to the recycle bin." };
}

export async function restoreInvoice(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(invoices).set({ deletedAt: null }).where(eq(invoices.id, id));
  refreshWorkspace();
  return { success: true, message: "Invoice restored." };
}

const inventoryInput = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unitType: z.string().trim().min(1),
  centralRate: z.number().nonnegative(),
  currentStock: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
});

export async function getActiveInventory() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  return db.select().from(inventoryItems).where(isNull(inventoryItems.deletedAt));
}

export async function createInventoryItem(
  input: z.infer<typeof inventoryInput>,
): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = inventoryInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter the material name, category, unit, and central rate." };
  }

  const [created] = await db
    .insert(inventoryItems)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      unitType: parsed.data.unitType,
      centralRate: money(parsed.data.centralRate),
      currentStock: money(parsed.data.currentStock ?? 0),
      lowStockThreshold: money(parsed.data.lowStockThreshold ?? 10),
    })
    .returning({ id: inventoryItems.id });

  refreshWorkspace();
  return { success: true, message: "Inventory item saved.", data: created };
}

export async function softDeleteInventoryItem(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(inventoryItems).set({ deletedAt: new Date() }).where(eq(inventoryItems.id, id));
  refreshWorkspace();
  return { success: true, message: "Inventory item moved to the recycle bin." };
}

export async function restoreInventoryItem(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db
    .update(inventoryItems)
    .set({ deletedAt: null })
    .where(eq(inventoryItems.id, id));
  refreshWorkspace();
  return { success: true, message: "Inventory item restored." };
}

const staffInput = z.object({
  fullName: z.string().trim().min(1),
  role: z.string().trim().min(1),
  hourlyRate: z.number().nonnegative(),
  dailyBaseRate: z.number().nonnegative(),
});

export async function createStaff(input: z.infer<typeof staffInput>): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = staffInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter the staff name, role, and rates." };
  }

  const [created] = await db
    .insert(staff)
    .values({
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      hourlyRate: money(parsed.data.hourlyRate),
      dailyBaseRate: money(parsed.data.dailyBaseRate),
    })
    .returning({ id: staff.id });

  refreshWorkspace();
  return { success: true, message: "Staff member saved.", data: created };
}

export async function softDeleteStaff(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(staff).set({ deletedAt: new Date() }).where(eq(staff.id, id));
  refreshWorkspace();
  return { success: true, message: "Staff member moved to the recycle bin." };
}

export async function restoreStaff(id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  await db.update(staff).set({ deletedAt: null }).where(eq(staff.id, id));
  refreshWorkspace();
  return { success: true, message: "Staff member restored." };
}

const rentalInput = z.object({
  assetName: z.string().trim().min(1),
  borrowerType: z.enum(["REGISTERED_CLIENT", "UNREGISTERED"]),
  borrowerName: z.string().trim().min(1),
  borrowerContact: z.string().trim().optional(),
  dailyRate: z.number().nonnegative(),
  rentedAt: z.string().datetime(),
});

export async function createAssetRental(
  input: z.infer<typeof rentalInput>,
): Promise<ActionResult<{ id: string }>> {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = rentalInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter the asset, borrower, and daily rate." };
  }

  const [created] = await db
    .insert(assetRentals)
    .values({
      assetName: parsed.data.assetName,
      borrowerType: parsed.data.borrowerType,
      borrowerName: parsed.data.borrowerName,
      borrowerContact: parsed.data.borrowerContact,
      dailyRate: money(parsed.data.dailyRate),
      rentedAt: new Date(parsed.data.rentedAt),
    })
    .returning({ id: assetRentals.id });

  refreshWorkspace();
  return { success: true, message: "Asset rental recorded.", data: created };
}

export async function getSoftDeletedEntities() {
  if (!process.env.DATABASE_URL) {
    return {
      clients: [],
      projects: [],
      invoices: [],
      inventory: [],
      staff: [],
      assetRentals: [],
    };
  }

  const [deletedClients, deletedProjects, deletedInvoices, deletedInventory, deletedStaff, deletedRentals] =
    await Promise.all([
      db.select().from(clients).where(isNotNull(clients.deletedAt)),
      db.select().from(projects).where(isNotNull(projects.deletedAt)),
      db.select().from(invoices).where(isNotNull(invoices.deletedAt)),
      db.select().from(inventoryItems).where(isNotNull(inventoryItems.deletedAt)),
      db.select().from(staff).where(isNotNull(staff.deletedAt)),
      db.select().from(assetRentals).where(isNotNull(assetRentals.deletedAt)),
    ]);

  return {
    clients: deletedClients,
    projects: deletedProjects,
    invoices: deletedInvoices,
    inventory: deletedInventory,
    staff: deletedStaff,
    assetRentals: deletedRentals,
  };
}

const deliveryInput = z.object({
  projectId: z.uuid(),
  inventoryItemId: z.uuid(),
  quantity: z.number().positive(),
  overrideRate: z.number().nonnegative().optional(),
  transitPassNo: z.string().trim().optional(),
  ewayBillNo: z.string().trim().optional(),
});

export async function syncDeliveryLedger(input: z.infer<typeof deliveryInput>) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  const parsed = deliveryInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Choose a project, material, and quantity." };
  }

  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, parsed.data.inventoryItemId));

    if (!item || item.deletedAt) {
      return { success: false, message: "Inventory item was not found." };
    }

    const projection = deductInventory(
      Number(item.currentStock),
      parsed.data.quantity,
      Number(item.lowStockThreshold),
    );

    if (projection.remaining < 0) {
      return {
        success: false,
        message: "Not enough stock for this delivery.",
        data: { lowStock: true, remaining: Number(item.currentStock) },
      };
    }

    const centralRate = Number(item.centralRate);
    const effectiveRate = parsed.data.overrideRate ?? centralRate;
    const totalPrice = roundMoney(parsed.data.quantity * effectiveRate);

    const [delivery] = await tx
      .insert(deliveryLedger)
      .values({
        projectId: parsed.data.projectId,
        inventoryItemId: item.id,
        materialName: item.name,
        quantity: money(parsed.data.quantity),
        unitType: item.unitType,
        centralRate: money(centralRate),
        overrideRate: money(effectiveRate),
        totalPrice: money(totalPrice),
        transitPassNo: parsed.data.transitPassNo,
        ewayBillNo: parsed.data.ewayBillNo,
      })
      .returning({ id: deliveryLedger.id });

    await tx
      .update(inventoryItems)
      .set({ currentStock: money(projection.remaining) })
      .where(eq(inventoryItems.id, item.id));

    await tx.insert(stockMovements).values({
      inventoryItemId: item.id,
      deliveryId: delivery.id,
      direction: "OUT",
      quantity: money(projection.issued),
      balanceAfter: money(projection.remaining),
      reason: "Delivery ledger sync",
    });

    refreshWorkspace();
    return {
      success: true,
      message: projection.lowStock
        ? "Delivery recorded. Stock is at or below the safety threshold."
        : "Delivery recorded and stock deducted.",
      data: {
        deliveryId: delivery.id,
        remaining: projection.remaining,
        lowStock: projection.lowStock,
      },
    };
  });
}

export async function resetDeliveryRateOverride(deliveryId: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  if (!z.uuid().safeParse(deliveryId).success) {
    return { success: false, message: "Choose a delivery row to reset." };
  }

  const [row] = await db
    .select()
    .from(deliveryLedger)
    .where(eq(deliveryLedger.id, deliveryId));

  if (!row || row.deletedAt) {
    return { success: false, message: "Delivery row was not found." };
  }

  const totalPrice = roundMoney(Number(row.quantity) * Number(row.centralRate));
  await db
    .update(deliveryLedger)
    .set({
      overrideRate: row.centralRate,
      totalPrice: money(totalPrice),
    })
    .where(eq(deliveryLedger.id, deliveryId));

  refreshWorkspace();
  return { success: true, message: "Override rate reset to the central rate." };
}

const uploadInput = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
});

export async function createPresignedUpload(fileName: string, contentType: string) {
  const parsed = uploadInput.safeParse({ fileName, contentType });
  if (!parsed.success) {
    return { success: false, message: "Choose a file name and content type." };
  }

  try {
    const upload = await createPresignedUploadUrl(parsed.data);
    return { success: true, message: "Upload URL ready.", data: upload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare the upload.";
    return { success: false, message };
  }
}

export async function getClients() {
  return getActiveClients();
}

export async function getProjects() {
  return getActiveProjects();
}

export async function getInventory() {
  return getActiveInventory();
}

export async function getStaff() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  return db.select().from(staff).where(isNull(staff.deletedAt));
}

const softDeleteModels = {
  system_settings: systemSettings,
  clients,
  projects,
  central_inventory: centralInventory,
  inventory_items: inventoryItems,
  invoices,
  ledger_entries: ledgerEntries,
  delivery_ledger: deliveryLedger,
  stock_movements: stockMovements,
  invoice_payments: invoicePayments,
  assets,
  asset_assignments: assetAssignments,
  asset_rentals: assetRentals,
  staff,
  attendance_logs: attendanceLogs,
  payroll_slips: payrollSlips,
  subcontracts,
  subcontract_draws: subcontractDraws,
} as const;

type SoftDeleteTable = keyof typeof softDeleteModels;

function isSoftDeleteTable(table: string): table is SoftDeleteTable {
  return table in softDeleteModels;
}

export async function softDeleteEntity(table: string, id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  if (!isSoftDeleteTable(table) || !z.uuid().safeParse(id).success) {
    return { success: false, message: "Choose a soft-delete table and a valid record id." };
  }

  const model = softDeleteModels[table];
  await db.update(model).set({ deletedAt: new Date() }).where(eq(model.id, id));
  refreshWorkspace();
  return { success: true, message: "Record moved to the recycle bin." };
}

export async function restoreEntity(table: string, id: string) {
  if (!process.env.DATABASE_URL) {
    return unavailable();
  }

  if (!isSoftDeleteTable(table) || !z.uuid().safeParse(id).success) {
    return { success: false, message: "Choose a soft-delete table and a valid record id." };
  }

  const model = softDeleteModels[table];
  await db.update(model).set({ deletedAt: null }).where(eq(model.id, id));
  refreshWorkspace();
  return { success: true, message: "Record restored." };
}

export async function getRecycleBinItems() {
  if (!process.env.DATABASE_URL) {
    return {
      system_settings: [],
      clients: [],
      projects: [],
      central_inventory: [],
      inventory_items: [],
      invoices: [],
      ledger_entries: [],
      delivery_ledger: [],
      stock_movements: [],
      invoice_payments: [],
      assets: [],
      asset_assignments: [],
      asset_rentals: [],
      staff: [],
      attendance_logs: [],
      payroll_slips: [],
      subcontracts: [],
      subcontract_draws: [],
    };
  }

  const [
    deletedSettings,
    deletedClients,
    deletedProjects,
    deletedCentralInventory,
    deletedInventory,
    deletedInvoices,
    deletedLedger,
    deletedDeliveries,
    deletedMovements,
    deletedPayments,
    deletedAssets,
    deletedAssignments,
    deletedRentals,
    deletedStaff,
    deletedAttendance,
    deletedPayroll,
    deletedSubcontracts,
    deletedDraws,
  ] = await Promise.all([
    db.select().from(systemSettings).where(isNotNull(systemSettings.deletedAt)),
    db.select().from(clients).where(isNotNull(clients.deletedAt)),
    db.select().from(projects).where(isNotNull(projects.deletedAt)),
    db.select().from(centralInventory).where(isNotNull(centralInventory.deletedAt)),
    db.select().from(inventoryItems).where(isNotNull(inventoryItems.deletedAt)),
    db.select().from(invoices).where(isNotNull(invoices.deletedAt)),
    db.select().from(ledgerEntries).where(isNotNull(ledgerEntries.deletedAt)),
    db.select().from(deliveryLedger).where(isNotNull(deliveryLedger.deletedAt)),
    db.select().from(stockMovements).where(isNotNull(stockMovements.deletedAt)),
    db.select().from(invoicePayments).where(isNotNull(invoicePayments.deletedAt)),
    db.select().from(assets).where(isNotNull(assets.deletedAt)),
    db.select().from(assetAssignments).where(isNotNull(assetAssignments.deletedAt)),
    db.select().from(assetRentals).where(isNotNull(assetRentals.deletedAt)),
    db.select().from(staff).where(isNotNull(staff.deletedAt)),
    db.select().from(attendanceLogs).where(isNotNull(attendanceLogs.deletedAt)),
    db.select().from(payrollSlips).where(isNotNull(payrollSlips.deletedAt)),
    db.select().from(subcontracts).where(isNotNull(subcontracts.deletedAt)),
    db.select().from(subcontractDraws).where(isNotNull(subcontractDraws.deletedAt)),
  ]);

  return {
    system_settings: deletedSettings,
    clients: deletedClients,
    projects: deletedProjects,
    central_inventory: deletedCentralInventory,
    inventory_items: deletedInventory,
    invoices: deletedInvoices,
    ledger_entries: deletedLedger,
    delivery_ledger: deletedDeliveries,
    stock_movements: deletedMovements,
    invoice_payments: deletedPayments,
    assets: deletedAssets,
    asset_assignments: deletedAssignments,
    asset_rentals: deletedRentals,
    staff: deletedStaff,
    attendance_logs: deletedAttendance,
    payroll_slips: deletedPayroll,
    subcontracts: deletedSubcontracts,
    subcontract_draws: deletedDraws,
  };
}
