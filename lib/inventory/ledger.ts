import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/db";
import { inventoryItems, inventoryStockLogs, stockMovements } from "@/db/schema";
import {
  projectStockLevel,
  type StockChangeType,
} from "@/lib/engines/inventory-engine";
import { roundMoney } from "@/lib/money";

type QueryExecutor = Pick<Database, "select" | "insert" | "update">;

export class StockShortageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockShortageError";
  }
}

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

export async function writeStockAdjustment(
  executor: QueryExecutor,
  input: {
    itemId: string;
    quantity: number;
    changeType: StockChangeType;
    referenceId?: string;
    notes?: string;
    allowNegative?: boolean;
  },
) {
  const [item] = await executor
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, input.itemId), isNull(inventoryItems.deletedAt)));

  if (!item) {
    return { skipped: true as const };
  }

  const projection = projectStockLevel(
    Number(item.currentStock),
    input.quantity,
    input.changeType,
    Number(item.lowStockThreshold),
    input.allowNegative ?? false,
  );

  if (!projection.permitted) {
    throw new StockShortageError(
      `Not enough stock for ${item.name}. ${projection.previousStock} on hand, ${projection.quantity} requested.`,
    );
  }

  await executor
    .update(inventoryItems)
    .set({ currentStock: money(projection.newStock) })
    .where(eq(inventoryItems.id, item.id));

  await executor.insert(inventoryStockLogs).values({
    itemId: item.id,
    changeType: input.changeType,
    quantity: money(projection.quantity),
    previousStock: money(projection.previousStock),
    newStock: money(projection.newStock),
    referenceId: input.referenceId,
    notes: input.notes,
  });

  await executor.insert(stockMovements).values({
    inventoryItemId: item.id,
    direction: projection.direction,
    quantity: money(projection.quantity),
    balanceAfter: money(projection.newStock),
    reason: input.notes || input.referenceId || input.changeType,
  });

  return {
    skipped: false as const,
    itemName: item.name,
    previousStock: projection.previousStock,
    newStock: projection.newStock,
    lowStock: projection.lowStock,
    warning: projection.warning,
  };
}
