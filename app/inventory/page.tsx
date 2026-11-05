import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getInventoryCatalog } from "@/controllers/inventory";
import { InventoryDesk } from "@/views/inventory/inventory-desk";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const denied = await gate("inventory.read");
  if (denied) return denied;

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
