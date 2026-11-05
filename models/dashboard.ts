import { and, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { assetAssignments, inventoryItems } from "@/db/schema";

export async function dashboardCounts() {
  if (!process.env.DATABASE_URL) {
    return { lowStock: 0, overdueTools: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const [stock, rentals] = await Promise.all([
    db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(isNull(inventoryItems.deletedAt), sql`${inventoryItems.currentStock} <= ${inventoryItems.lowStockThreshold}`)),
    db
      .select({ id: assetAssignments.id })
      .from(assetAssignments)
      .where(and(isNull(assetAssignments.actualReturnDate), isNull(assetAssignments.deletedAt), lt(assetAssignments.expectedReturnDate, today))),
  ]);
  return { lowStock: stock.length, overdueTools: rentals.length };
}
