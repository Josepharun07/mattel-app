"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventoryItems, inventoryStockLogs, invoices } from "@/db/schema";
import { isLowStockTrigger, type StockChangeType } from "@/lib/engines/inventory-engine";
import { writeStockAdjustment } from "@/lib/inventory/ledger";

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unitType: string;
  centralRate: number;
  currentStock: number;
  lowStockThreshold: number;
  lowStock: boolean;
};

export type StockLogRow = {
  id: string;
  itemId: string;
  itemName: string;
  changeType: StockChangeType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
};

const fallbackItems: CatalogItem[] = [
  { id: "item-msand", name: "M-Sand", category: "Aggregates", unitType: "CFT", centralRate: 45, currentStock: 1200, lowStockThreshold: 100, lowStock: false },
  { id: "item-psand", name: "P-Sand", category: "Aggregates", unitType: "CFT", centralRate: 55, currentStock: 80, lowStockThreshold: 100, lowStock: true },
  { id: "item-metal", name: "20mm Metal", category: "Aggregates", unitType: "CFT", centralRate: 42, currentStock: 1500, lowStockThreshold: 100, lowStock: false },
  { id: "item-opc", name: "Ordinary Portland Cement (OPC)", category: "Binder", unitType: "Bags", centralRate: 380, currentStock: 40, lowStockThreshold: 50, lowStock: true },
];

const changeTypes = ["INBOUND_PURCHASE", "OUTBOUND_INVOICE", "MANUAL_CORRECTION", "RETURN"] as const;

const createItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unitType: z.string().trim().min(1),
  centralRate: z.number().nonnegative(),
  currentStock: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
});

function money(amount: number) {
  return amount.toFixed(2);
}

function mapItem(item: {
  id: string;
  name: string;
  category: string;
  unitType: string;
  centralRate: string;
  currentStock: string;
  lowStockThreshold: string;
}): CatalogItem {
  const currentStock = Number(item.currentStock);
  const lowStockThreshold = Number(item.lowStockThreshold);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unitType: item.unitType,
    centralRate: Number(item.centralRate),
    currentStock,
    lowStockThreshold,
    lowStock: isLowStockTrigger(currentStock, lowStockThreshold),
  };
}

export async function getInventoryCatalog(search?: string, category?: string) {
  if (!process.env.DATABASE_URL) {
    return filterCatalog(fallbackItems, search, category);
  }

  try {
    const filters = [isNull(inventoryItems.deletedAt)];
    if (search?.trim()) {
      filters.push(ilike(inventoryItems.name, `%${search.trim()}%`));
    }
    if (category?.trim()) {
      filters.push(eq(inventoryItems.category, category.trim()));
    }

    const rows = await db
      .select()
      .from(inventoryItems)
      .where(and(...filters));

    return rows.map(mapItem);
  } catch {
    return filterCatalog(fallbackItems, search, category);
  }
}

function filterCatalog(items: CatalogItem[], search?: string, category?: string) {
  const query = search?.trim().toLowerCase();
  return items.filter((item) => {
    const matchesName = !query || item.name.toLowerCase().includes(query);
    const matchesCategory = !category || item.category === category;
    return matchesName && matchesCategory;
  });
}

export async function getLowStockAlerts() {
  const items = await getInventoryCatalog();
  return items.filter((item) => item.lowStock);
}

export async function createInventoryItem(data: z.infer<typeof createItemSchema>) {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: "Enter a material name, category, unit, and central rate." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. The material was added in this session only.",
      item: {
        id: crypto.randomUUID(),
        name: parsed.data.name,
        category: parsed.data.category,
        unitType: parsed.data.unitType,
        centralRate: parsed.data.centralRate,
        currentStock: parsed.data.currentStock ?? 0,
        lowStockThreshold: parsed.data.lowStockThreshold ?? 10,
        lowStock: isLowStockTrigger(
          parsed.data.currentStock ?? 0,
          parsed.data.lowStockThreshold ?? 10,
        ),
      } satisfies CatalogItem,
    };
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
    .returning();

  revalidatePath("/inventory");
  return { success: true, message: "Material saved.", item: mapItem(created) };
}

export async function adjustStock(
  itemId: string,
  quantity: number,
  type: StockChangeType,
  referenceId?: string,
  notes?: string,
) {
  if (!itemId || !changeTypes.includes(type) || !Number.isFinite(quantity) || quantity <= 0) {
    return { success: false, message: "Choose a material and a quantity greater than zero." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. This adjustment is kept in the session audit log.",
    };
  }

  const parsed = z
    .object({
      itemId: z.uuid(),
      quantity: z.number().positive(),
      type: z.enum(changeTypes),
      referenceId: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .safeParse({ itemId, quantity, type, referenceId, notes });

  if (!parsed.success) {
    return { success: false, message: "Choose a saved material and a quantity greater than zero." };
  }

  try {
    const result = await db.transaction((tx) =>
      writeStockAdjustment(tx, {
        itemId: parsed.data.itemId,
        quantity: parsed.data.quantity,
        changeType: parsed.data.type,
        referenceId: parsed.data.referenceId,
        notes: parsed.data.notes,
      }),
    );

    if (result.skipped) {
      return { success: false, message: "Material was not found." };
    }

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    return {
      success: true,
      message: result.lowStock
        ? `${result.itemName} adjusted. Stock is at or below the safety threshold.`
        : `${result.itemName} adjusted.`,
      newStock: result.newStock,
      lowStock: result.lowStock,
      warning: result.warning,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not adjust stock.";
    return { success: false, message };
  }
}

export async function processInvoiceStockDeduction(
  invoiceId: string,
  items: { inventoryItemId: string; quantity: number; name?: string }[],
) {
  if (!z.uuid().safeParse(invoiceId).success) {
    return { success: false, message: "Choose a saved invoice." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      message: "DATABASE_URL is not configured. Invoice stock deduction will run once PostgreSQL is connected.",
    };
  }

  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.id, invoiceId));

      for (const line of items) {
        if (!z.uuid().safeParse(line.inventoryItemId).success || line.quantity <= 0) {
          continue;
        }
        await writeStockAdjustment(tx, {
          itemId: line.inventoryItemId,
          quantity: line.quantity,
          changeType: "OUTBOUND_INVOICE",
          referenceId: invoice?.invoiceNumber ?? invoiceId,
          notes: line.name,
        });
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    return { success: true, message: "Invoice stock deducted." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not deduct invoice stock.";
    return { success: false, message };
  }
}

export async function getStockLogs(): Promise<StockLogRow[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await db
      .select({
        id: inventoryStockLogs.id,
        itemId: inventoryStockLogs.itemId,
        itemName: inventoryItems.name,
        changeType: inventoryStockLogs.changeType,
        quantity: inventoryStockLogs.quantity,
        previousStock: inventoryStockLogs.previousStock,
        newStock: inventoryStockLogs.newStock,
        referenceId: inventoryStockLogs.referenceId,
        notes: inventoryStockLogs.notes,
        createdAt: inventoryStockLogs.createdAt,
      })
      .from(inventoryStockLogs)
      .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStockLogs.itemId))
      .orderBy(desc(inventoryStockLogs.createdAt));

    return rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      itemName: row.itemName,
      changeType: row.changeType,
      quantity: Number(row.quantity),
      previousStock: Number(row.previousStock),
      newStock: Number(row.newStock),
      referenceId: row.referenceId,
      notes: row.notes,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}
