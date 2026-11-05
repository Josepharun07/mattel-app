import { and, isNull, lt, sql } from "drizzle-orm";
import { getSiteBook } from "@/actions/operations-actions";
import { OperationsHome } from "@/components/shell/operations-home";
import { db } from "@/db";
import { assetAssignments, inventoryItems } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/current";

export default async function HomePage() {
  const session = await getCurrentSession();
  const today = new Date().toISOString().slice(0, 10);
  let lowStock = 0;
  let overdueTools = 0;
  if (process.env.DATABASE_URL) {
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
    lowStock = stock.length;
    overdueTools = rentals.length;
  }

  return <OperationsHome book={await getSiteBook()} name={session?.name ?? "there"} lowStock={lowStock} overdueTools={overdueTools} />;
}
