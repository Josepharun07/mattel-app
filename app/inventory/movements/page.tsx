import type { Metadata } from "next";
import { MovementLogLoader } from "@/components/inventory/movement-log";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Stock movements" };

export default function StockMovementsPage() {
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
