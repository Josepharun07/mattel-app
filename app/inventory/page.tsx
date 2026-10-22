import type { Metadata } from "next";
import { getInventoryCatalog } from "@/actions/inventory-actions";
import { InventoryDesk } from "@/components/inventory/inventory-desk";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const items = await getInventoryCatalog();

  return (
    <PageFrame
      eyebrow="Warehouse"
      title="Inventory catalog"
      description="Materials at or below the safety threshold are flagged. Invoice issue deducts linked catalog stock."
      width="wide"
    >
      <InventoryDesk initialItems={items} />
    </PageFrame>
  );
}
