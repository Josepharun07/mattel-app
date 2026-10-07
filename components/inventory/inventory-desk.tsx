"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import {
  createInventoryItem,
  type CatalogItem,
} from "@/actions/inventory-actions";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { LowStockBanner } from "@/components/inventory/low-stock-banner";
import { StockAdjustmentModal } from "@/components/inventory/stock-adjustment-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLowStockTrigger, type StockChangeType } from "@/lib/engines/inventory-engine";
import { appendSessionStockLog } from "@/lib/inventory/session-log";
import { formatInr } from "@/lib/money";

export function InventoryDesk({ initialItems }: { initialItems: CatalogItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ name: "", category: "Aggregates", unitType: "CFT", centralRate: "0", currentStock: "0", lowStockThreshold: "10" });

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))],
    [items],
  );
  const filtered = items.filter((item) => {
    const matchesName = item.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === "all" || item.category === category;
    return matchesName && matchesCategory;
  });
  const lowStock = items.filter((item) => item.lowStock);
  const estimatedValue = items.reduce((sum, item) => sum + item.currentStock * item.centralRate, 0);

  function openAdjust(item: CatalogItem) {
    setSelected(item);
    setOpen(true);
  }

  function applyMovement(result: {
    itemId: string;
    changeType: StockChangeType;
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceId?: string;
    notes?: string;
    message: string;
  }) {
    setItems((current) =>
      current.map((item) =>
        item.id === result.itemId
          ? {
              ...item,
              currentStock: result.newStock,
              lowStock: isLowStockTrigger(result.newStock, item.lowStockThreshold),
            }
          : item,
      ),
    );
    const item = items.find((entry) => entry.id === result.itemId);
    appendSessionStockLog({
      id: crypto.randomUUID(),
      itemId: result.itemId,
      itemName: item?.name ?? "Material",
      changeType: result.changeType,
      quantity: result.quantity,
      previousStock: result.previousStock,
      newStock: result.newStock,
      referenceId: result.referenceId ?? null,
      notes: result.notes ?? null,
      createdAt: new Date().toISOString(),
    });
    setNotice(result.message);
  }

  async function addMaterial(event: FormEvent) {
    event.preventDefault();
    const result = await createInventoryItem({
      name: draft.name,
      category: draft.category,
      unitType: draft.unitType,
      centralRate: Number(draft.centralRate) || 0,
      currentStock: Number(draft.currentStock) || 0,
      lowStockThreshold: Number(draft.lowStockThreshold) || 0,
    });
    if (result.item) {
      setItems((current) => [result.item as CatalogItem, ...current]);
      setDraft({ name: "", category: "Aggregates", unitType: "CFT", centralRate: "0", currentStock: "0", lowStockThreshold: "10" });
    }
    setNotice(result.message);
  }

  return (
    <div className="space-y-5">
      <LowStockBanner items={lowStock} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Catalog items" value={String(items.length)} />
        <Metric
          label="Low stock"
          value={String(lowStock.length)}
          badge={lowStock.length > 0 ? <Badge tone="warning">{lowStock.length} alerts</Badge> : <Badge tone="success">Clear</Badge>}
        />
        <Metric label="Estimated value" value={formatInr(estimatedValue)} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search material"
            className="w-56"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory/movements">
            <RefreshCw className="size-4" />
            Stock audit log
          </Link>
        </Button>
      </div>
      <InventoryTable items={filtered} onAdjust={openAdjust} />
      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-6" onSubmit={addMaterial}>
        <Field label="Material" className="md:col-span-2">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        </Field>
        <Field label="Category">
          <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
        </Field>
        <Field label="Unit">
          <Input value={draft.unitType} onChange={(event) => setDraft({ ...draft, unitType: event.target.value })} />
        </Field>
        <Field label="Central rate">
          <Input className="font-mono" value={draft.centralRate} onChange={(event) => setDraft({ ...draft, centralRate: event.target.value })} />
        </Field>
        <Field label="Opening stock">
          <Input className="font-mono" value={draft.currentStock} onChange={(event) => setDraft({ ...draft, currentStock: event.target.value })} />
        </Field>
        <div className="md:col-span-6">
          <Button type="submit">Add material</Button>
        </div>
      </form>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      <StockAdjustmentModal item={selected} open={open} onOpenChange={setOpen} onApplied={applyMovement} />
    </div>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xl font-semibold">{value}</p>
        {badge}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={className ? `space-y-1 text-sm ${className}` : "space-y-1 text-sm"}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}
