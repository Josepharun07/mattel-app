"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceCatalogItem } from "@/actions/invoice-actions";
import { roundMoney } from "@/lib/money";

export type InvoiceLine = {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: string;
  unitType: string;
  centralRate: number;
  overrideRate: string;
};

export function lineTotal(line: InvoiceLine) {
  const quantity = Number(line.quantity);
  const override = line.overrideRate.trim() === "" ? undefined : Number(line.overrideRate);
  const rate = override ?? line.centralRate;
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) {
    return 0;
  }
  return roundMoney(quantity * rate);
}

export function LineItemsGrid({
  lines,
  catalog,
  unitTypes,
  onChange,
}: {
  lines: InvoiceLine[];
  catalog: InvoiceCatalogItem[];
  unitTypes: string[];
  onChange: (lines: InvoiceLine[]) => void;
}) {
  function update(id: string, patch: Partial<InvoiceLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function applyMaterial(id: string, inventoryItemId: string) {
    const item = catalog.find((entry) => entry.id === inventoryItemId);
    if (!item) {
      return;
    }
    update(id, {
      inventoryItemId: item.id,
      name: item.name,
      unitType: item.unitType,
      centralRate: item.centralRate,
      overrideRate: String(item.centralRate),
    });
  }

  function addRow() {
    const item = catalog[0];
    onChange([
      ...lines,
      {
        id: crypto.randomUUID(),
        inventoryItemId: item?.id ?? "",
        name: item?.name ?? "",
        quantity: "1",
        unitType: item?.unitType ?? unitTypes[0] ?? "CFT",
        centralRate: item?.centralRate ?? 0,
        overrideRate: item ? String(item.centralRate) : "",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Line items</h2>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          Add row
        </Button>
      </div>
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={line.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Row {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onChange(lines.filter((entry) => entry.id !== line.id))}
              >
                Delete row
              </Button>
            </div>
            <label className="block space-y-1 text-xs">
              <span>Material</span>
              <Select
                value={line.inventoryItemId || undefined}
                onValueChange={(value) => applyMaterial(line.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs">
                <span>Quantity</span>
                <Input
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => update(line.id, { quantity: event.target.value })}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>Unit</span>
                <Select
                  value={line.unitType}
                  onValueChange={(value) => update(line.id, { unitType: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-xs">
                <span>Central rate</span>
                <Input readOnly value={line.centralRate.toFixed(2)} />
              </label>
              <label className="space-y-1 text-xs">
                <span>Override rate</span>
                <Input
                  inputMode="decimal"
                  value={line.overrideRate}
                  onChange={(event) => update(line.id, { overrideRate: event.target.value })}
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Reset to central value"
                onClick={() => update(line.id, { overrideRate: String(line.centralRate) })}
              >
                Reset to central value (↺)
              </Button>
              <span className="font-mono text-xs">₹{lineTotal(line).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
