import type { Metadata } from "next";
import { MovementLogLoader } from "@/components/inventory/movement-log";

export const metadata: Metadata = { title: "Stock movements" };

export default function StockMovementsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Warehouse</p>
      <h1 className="mt-1 text-2xl font-semibold">Stock movement audit</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Inbound purchases, invoice deductions, returns, and manual corrections.
      </p>
      <MovementLogLoader />
    </div>
  );
}
