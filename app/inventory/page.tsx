import type { Metadata } from "next";
import { getInventoryCatalog } from "@/actions/inventory-actions";
import { InventoryDesk } from "@/components/inventory/inventory-desk";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const items = await getInventoryCatalog();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Warehouse</p>
      <h1 className="mt-1 text-2xl font-semibold">Inventory catalog</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Materials at or below the safety threshold are flagged. Invoice issue deducts linked catalog stock.
      </p>
      <InventoryDesk initialItems={items} />
    </div>
  );
}
