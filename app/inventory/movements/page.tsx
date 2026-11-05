import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { MovementLogLoader } from "@/views/inventory/movement-log";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Stock movements" };

export default async function StockMovementsPage() {
  const denied = await gate("inventory.read");
  if (denied) return denied;
  return (
    <PageFrame
      eyebrow="Warehouse"
      title="Stock movement audit"
      description="Inbound purchases, invoice deductions, returns, and manual corrections."
    >
      <MovementLogLoader />
    </PageFrame>
  );
}
