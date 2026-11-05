"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { CatalogItem } from "@/controllers/inventory";
import { adjustStock } from "@/controllers/inventory";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/views/ui/dialog";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/ui/select";
import { Textarea } from "@/views/ui/textarea";
import { projectStockLevel, type StockChangeType } from "@/lib/engines/inventory-engine";

const adjustmentTypes: { value: StockChangeType; label: string }[] = [
  { value: "INBOUND_PURCHASE", label: "Inbound purchase" },
  { value: "RETURN", label: "Return to stock" },
  { value: "MANUAL_CORRECTION", label: "Manual write-off" },
];

export function StockAdjustmentModal({
  item,
  open,
  onOpenChange,
  onApplied,
}: {
  item: CatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (result: {
    itemId: string;
    changeType: StockChangeType;
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceId?: string;
    notes?: string;
    message: string;
  }) => void;
}) {
  const confirm = useConfirm();
  const [quantity, setQuantity] = useState("1");
  const [changeType, setChangeType] = useState<StockChangeType>("INBOUND_PURCHASE");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (!item) {
      return null;
    }
    return projectStockLevel(item.currentStock, Number(quantity) || 0, changeType, item.lowStockThreshold);
  }, [item, quantity, changeType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const accepted = await confirm({ title: "Adjust this stock?", detail: "This changes the quantity on hand." });
    if (!accepted) return;
    if (!item || !preview) {
      return;
    }
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a quantity greater than zero.");
      return;
    }
    if (!preview.permitted) {
      setMessage("This write-off would take stock below zero.");
      return;
    }

    setPending(true);
    const result = await adjustStock(item.id, amount, changeType, referenceId || undefined, notes || undefined);
    setPending(false);

    if (result.success) {
      onApplied({
        itemId: item.id,
        changeType,
        quantity: amount,
        previousStock: item.currentStock,
        newStock: result.newStock ?? preview.newStock,
        referenceId: referenceId || undefined,
        notes: notes || undefined,
        message: result.message,
      });
      onOpenChange(false);
      return;
    }

    if ("offline" in result && result.offline) {
      onApplied({
        itemId: item.id,
        changeType,
        quantity: amount,
        previousStock: preview.previousStock,
        newStock: preview.newStock,
        referenceId: referenceId || undefined,
        notes: notes || undefined,
        message: result.message,
      });
      onOpenChange(false);
      return;
    }

    setMessage(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {item?.name ?? "stock"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <label className="block space-y-1 text-sm">
            <Label>Movement</Label>
            <Select value={changeType} onValueChange={(value) => setChangeType(value as StockChangeType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adjustmentTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <Label htmlFor="adjust-qty">Quantity</Label>
            <Input id="adjust-qty" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <Label htmlFor="adjust-ref">Reference</Label>
            <Input id="adjust-ref" value={referenceId} onChange={(event) => setReferenceId(event.target.value)} placeholder="PO or invoice number" />
          </label>
          <label className="block space-y-1 text-sm">
            <Label htmlFor="adjust-notes">Notes</Label>
            <Textarea id="adjust-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {preview ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {preview.direction === "IN" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              {preview.previousStock} → {preview.newStock}
              {preview.warning ? " · would go negative" : ""}
              {preview.lowStock && preview.permitted ? " · low stock" : ""}
            </p>
          ) : null}
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <Button type="submit" disabled={pending || !preview?.permitted}>
            Record movement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
