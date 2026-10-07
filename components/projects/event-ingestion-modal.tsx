"use client";

import { useState, type FormEvent } from "react";
import { Truck } from "lucide-react";
import { recordProjectEvent } from "@/actions/ledger-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { finalEventPrice } from "@/lib/engines/ledger-engine";
import { UNIT_TYPES } from "@/lib/invoicing/studio-data";
import type { LedgerEntryView } from "@/lib/ledger/sample";
import { formatInr } from "@/lib/money";

const catalog = [
  { id: "item-msand", name: "M-Sand", unitType: "CFT", centralRate: 45 },
  { id: "item-psand", name: "P-Sand", unitType: "CFT", centralRate: 55 },
  { id: "item-metal", name: "20mm Metal", unitType: "CFT", centralRate: 42 },
  { id: "item-opc", name: "Ordinary Portland Cement (OPC)", unitType: "Bags", centralRate: 380 },
];

const eventTypes = [
  ["MATERIAL_DRAW", "Material draw"],
  ["EQUIPMENT_USAGE", "Equipment usage"],
  ["TRANSIT_PASS", "Transit pass"],
  ["SITE_ACTION", "Site action"],
] as const;

export function EventIngestionModal({
  open,
  projectId,
  clientId,
  projectName,
  clientName,
  onClose,
  onRecorded,
}: {
  open: boolean;
  projectId: string;
  clientId: string;
  projectName: string;
  clientName: string;
  onClose: () => void;
  onRecorded: (entry: LedgerEntryView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({
    eventType: "MATERIAL_DRAW" as (typeof eventTypes)[number][0],
    description: "",
    quantity: "5",
    unitType: "Loads",
    centralRate: "45",
    overrideRate: "45",
    source: "DIRECT_PURCHASE" as "CENTRAL_INVENTORY" | "DIRECT_PURCHASE",
    inventoryItemId: "",
    vehicleNumber: "",
    transitPassNo: "",
    ewayBillNo: "",
  });

  function chooseCatalog(itemId: string) {
    const item = catalog.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    setDraft((current) => ({
      ...current,
      inventoryItemId: item.id,
      description: current.description.trim() ? current.description : item.name,
      unitType: item.unitType,
      centralRate: String(item.centralRate),
      overrideRate: String(item.centralRate),
      source: "CENTRAL_INVENTORY",
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await recordProjectEvent({
      projectId,
      clientId,
      entityType: "PROJECT",
      eventType: draft.eventType,
      description: draft.description,
      quantity: Number(draft.quantity),
      unitType: draft.unitType,
      centralRate: Number(draft.centralRate),
      overrideRate: Number(draft.overrideRate),
      source: draft.source,
      inventoryItemId: draft.source === "CENTRAL_INVENTORY" ? draft.inventoryItemId || undefined : undefined,
      vehicleNumber: draft.vehicleNumber || undefined,
      transitPassNo: draft.transitPassNo || undefined,
      ewayBillNo: draft.ewayBillNo || undefined,
    });
    if (result.offline && result.entry) {
      onRecorded({
        id: crypto.randomUUID(),
        projectId,
        clientId,
        projectName,
        clientName,
        invoiceId: null,
        entityType: result.entry.entityType,
        eventType: result.entry.eventType,
        description: result.entry.description,
        quantity: result.entry.quantity,
        unitType: result.entry.unitType,
        centralRate: result.entry.centralRate,
        overrideRate: result.entry.overrideRate,
        finalPrice: result.entry.finalPrice,
        source: result.entry.source,
        inventoryItemId: result.entry.inventoryItemId,
        vehicleNumber: result.entry.vehicleNumber,
        transitPassNo: result.entry.transitPassNo,
        ewayBillNo: result.entry.ewayBillNo,
        createdAt: new Date().toISOString(),
      });
      setDraft((current) => ({ ...current, description: "", vehicleNumber: "", transitPassNo: "", ewayBillNo: "" }));
      setMessage("");
      onClose();
    } else if (result.success) {
      setMessage("");
      onClose();
    } else {
      setMessage(result.message);
    }
    setBusy(false);
  }

  const preview = finalEventPrice(Number(draft.quantity) || 0, Number(draft.overrideRate) || 0);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record site event / material draw</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <label className="space-y-1 text-sm">
            <Label>Event</Label>
            <select
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={draft.eventType}
              onChange={(event) => setDraft({ ...draft, eventType: event.target.value as (typeof eventTypes)[number][0] })}
            >
              {eventTypes.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <Label>Material / activity</Label>
            <Input
              value={draft.description}
              placeholder="5 Loads M-Sand"
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <Label>Quantity</Label>
              <Input value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} required />
            </label>
            <label className="space-y-1 text-sm">
              <Label>Unit</Label>
              <select
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={draft.unitType}
                onChange={(event) => setDraft({ ...draft, unitType: event.target.value })}
              >
                {UNIT_TYPES.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <Label>Source</Label>
            <select
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={draft.source}
              onChange={(event) => setDraft({ ...draft, source: event.target.value as "CENTRAL_INVENTORY" | "DIRECT_PURCHASE" })}
            >
              <option value="DIRECT_PURCHASE">Direct</option>
              <option value="CENTRAL_INVENTORY">Inventory draw</option>
            </select>
          </label>
          {draft.source === "CENTRAL_INVENTORY" ? (
            <label className="space-y-1 text-sm">
              <Label>Catalog material</Label>
              <select
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={draft.inventoryItemId}
                onChange={(event) => chooseCatalog(event.target.value)}
                required
              >
                <option value="">Choose material</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {formatInr(item.centralRate)}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <Label>Central rate</Label>
              <Input readOnly className="font-mono" value={draft.centralRate} />
            </label>
            <label className="space-y-1 text-sm">
              <Label>Override rate</Label>
              <Input className="font-mono" value={draft.overrideRate} onChange={(event) => setDraft({ ...draft, overrideRate: event.target.value })} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Line total {formatInr(preview)}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <Label>Vehicle</Label>
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                <Input value={draft.vehicleNumber} onChange={(event) => setDraft({ ...draft, vehicleNumber: event.target.value })} />
              </span>
            </label>
            <label className="space-y-1 text-sm">
              <Label>Transit pass</Label>
              <Input value={draft.transitPassNo} onChange={(event) => setDraft({ ...draft, transitPassNo: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label>E-way bill</Label>
              <Input value={draft.ewayBillNo} onChange={(event) => setDraft({ ...draft, ewayBillNo: event.target.value })} />
            </label>
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" disabled={busy}>Save event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
