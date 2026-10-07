import { AlertTriangle } from "lucide-react";
import type { CatalogItem } from "@/actions/inventory-actions";

export function LowStockBanner({ items }: { items: CatalogItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Restock {items.length} material{items.length === 1 ? "" : "s"}</p>
        <p className="mt-1 text-amber-900">
          {items.map((item) => `${item.name} (${item.currentStock} ${item.unitType})`).join(" · ")}
        </p>
      </div>
    </div>
  );
}
