"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shell/StatusBadge";
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
import { isLowStock } from "@/lib/inventory/stock";
import { formatInr } from "@/lib/money";
import { useWorkspace } from "@/lib/workspace/store";

export function InventoryBoard() {
  const workspace = useWorkspace();
  const units = workspace.settings.unitTypes;
  const rows = workspace.inventory.filter((item) => !item.deletedAt);
  const [itemName, setItemName] = useState("");
  const [unitType, setUnitType] = useState(units[0] ?? "CFT");
  const [rate, setRate] = useState("0");
  const [stock, setStock] = useState("0");
  const [threshold, setThreshold] = useState("0");

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!itemName.trim()) {
            return;
          }
          workspace.addInventory({
            itemName: itemName.trim(),
            unitType,
            standardUnitRate: Number(rate) || 0,
            currentStock: Number(stock) || 0,
            minSafetyThreshold: Number(threshold) || 0,
          });
          setItemName("");
        }}
      >
        <Field label="Material" className="md:col-span-2">
          <Input value={itemName} onChange={(event) => setItemName(event.target.value)} required />
        </Field>
        <Field label="Unit">
          <Select value={unitType} onValueChange={setUnitType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Central rate">
          <Input className="font-mono" value={rate} onChange={(event) => setRate(event.target.value)} />
        </Field>
        <Field label="Stock">
          <Input className="font-mono" value={stock} onChange={(event) => setStock(event.target.value)} />
        </Field>
        <Field label="Threshold">
          <Input
            className="font-mono"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
        </Field>
        <div className="md:col-span-6">
          <Button type="submit" className="bg-action text-white hover:bg-action/90">
            Add material
          </Button>
        </div>
      </form>

      <ul className="divide-y rounded-xl border bg-white">
        {rows.map((item) => {
          const low = isLowStock(item.currentStock, item.minSafetyThreshold);
          return (
            <li key={item.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
              <div>
                <p className="font-medium">{item.itemName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.unitType} · {formatInr(item.standardUnitRate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs" htmlFor={`stock-${item.id}`}>
                  Stock
                </Label>
                <Input
                  id={`stock-${item.id}`}
                  className="w-24 font-mono"
                  defaultValue={String(item.currentStock)}
                  key={`${item.id}-${item.currentStock}`}
                  onBlur={(event) =>
                    workspace.updateInventory(item.id, { currentStock: Number(event.target.value) || 0 })
                  }
                />
                {low ? <StatusBadge tone="warn">Low stock</StatusBadge> : <StatusBadge tone="ok">In stock</StatusBadge>}
              </div>
              <Button type="button" variant="outline" onClick={() => workspace.archiveInventory(item.id)}>
                Archive
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
