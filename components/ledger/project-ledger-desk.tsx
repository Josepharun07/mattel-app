"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { compileSelectedRowsToInvoice, recordEventEntry } from "@/actions/ledger-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { finalEventPrice, getUnbilledLedgerRows } from "@/lib/engines/ledger-engine";
import type { LedgerEntryView, ProjectLedger } from "@/lib/ledger/sample";
import { formatInr } from "@/lib/money";

const storageKey = "mattel.ledger.session";
const eventName = "mattel-ledger-session";

type LedgerSession = { entries: LedgerEntryView[]; billedIds: string[] };
const emptySession: LedgerSession = { entries: [], billedIds: [] };
let raw = "";
let snapshot: LedgerSession = emptySession;

function readLedgerSession(): LedgerSession {
  if (typeof window === "undefined") {
    return emptySession;
  }
  const next = sessionStorage.getItem(storageKey) ?? "";
  if (next === raw) {
    return snapshot;
  }
  raw = next;
  if (!next) {
    snapshot = emptySession;
    return snapshot;
  }
  try {
    const parsed = JSON.parse(next) as LedgerSession;
    snapshot = {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      billedIds: Array.isArray(parsed.billedIds) ? parsed.billedIds : [],
    };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

function writeLedgerSession(next: LedgerSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function ProjectLedgerDesk({ initial }: { initial: ProjectLedger }) {
  const router = useRouter();
  const session = useSyncExternalStore(subscribe, readLedgerSession, () => emptySession);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    eventType: "MATERIAL_DRAW",
    description: "",
    quantity: "20",
    unitType: "Bags",
    centralRate: "380",
    overrideRate: "380",
    source: "CENTRAL_INVENTORY" as "CENTRAL_INVENTORY" | "DIRECT_PURCHASE",
    inventoryItemId: "item-opc",
    vehicleNumber: "",
  });

  const entries = useMemo(() => {
    const merged = [...initial.entries];
    for (const entry of session.entries) {
      if (entry.projectId === initial.project.id && !merged.some((row) => row.id === entry.id)) {
        merged.unshift(entry);
      }
    }
    return merged.map((entry) =>
      session.billedIds.includes(entry.id) ? { ...entry, invoiceId: entry.invoiceId ?? "session-invoice" } : entry,
    );
  }, [initial, session]);
  const unbilled = getUnbilledLedgerRows(entries, initial.project.id, "PROJECT");
  const selectedTotal = unbilled
    .filter((row) => selected.includes(row.id))
    .reduce((sum, row) => sum + row.finalPrice, 0);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await recordEventEntry({
      projectId: initial.project.id,
      clientId: initial.project.clientId,
      entityType: "PROJECT",
      eventType: draft.eventType,
      description: draft.description,
      quantity: Number(draft.quantity),
      unitType: draft.unitType,
      centralRate: Number(draft.centralRate),
      overrideRate: Number(draft.overrideRate),
      source: draft.source,
      inventoryItemId: draft.source === "CENTRAL_INVENTORY" ? draft.inventoryItemId : undefined,
      vehicleNumber: draft.vehicleNumber,
    });
    if (result.offline && result.entry) {
      const entry: LedgerEntryView = {
        id: crypto.randomUUID(),
        projectId: initial.project.id,
        clientId: initial.project.clientId,
        projectName: initial.project.name,
        clientName: initial.project.clientName,
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
      };
      const current = readLedgerSession();
      writeLedgerSession({ ...current, entries: [entry, ...current.entries] });
      setOpen(false);
      setDraft({ ...draft, description: "" });
    }
    setNotice(result.message);
    setBusy(false);
  }

  async function compileInvoice() {
    setBusy(true);
    const result = await compileSelectedRowsToInvoice(selected, {
      clientId: initial.project.clientId,
      projectId: initial.project.id,
    }, { gstEnabled: true, isInterstate: false });
    if (result.success || result.offline) {
      const current = readLedgerSession();
      writeLedgerSession({
        ...current,
        billedIds: [...new Set([...current.billedIds, ...selected])],
      });
      setSelected([]);
      setNotice(result.message);
      if (result.invoiceNumber) {
        router.push(`/invoices/create?compiled=${encodeURIComponent(result.invoiceNumber)}`);
      }
    } else {
      setNotice(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{initial.project.clientName}</p>
          <p className="font-medium">{unbilled.length} unbilled rows · {formatInr(unbilled.reduce((sum, row) => sum + row.finalPrice, 0))}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Log site event
          </Button>
          <Button type="button" disabled={busy || selected.length === 0} onClick={() => void compileInvoice()}>
            Generate invoice with selected rows
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Select</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Final price</th>
              <th className="px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {unbilled.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.description}`}
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </td>
                <td className="px-3 py-3">{row.description}</td>
                <td className="px-3 py-3">{row.eventType}</td>
                <td className="px-3 py-3 font-mono">{row.quantity} {row.unitType}</td>
                <td className="px-3 py-3 font-mono">{formatInr(row.overrideRate)}</td>
                <td className="px-3 py-3 font-mono">{formatInr(row.finalPrice)}</td>
                <td className="px-3 py-3">{row.source === "CENTRAL_INVENTORY" ? "Central inventory" : "Direct purchase"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">Selected {formatInr(selectedTotal)}</p>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daily site log</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={addEvent}>
            <label className="space-y-1 text-sm">
              <Label>Description</Label>
              <Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <Label>Quantity</Label>
                <Input value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} required />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Unit</Label>
                <Input value={draft.unitType} onChange={(event) => setDraft({ ...draft, unitType: event.target.value })} required />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Central rate</Label>
                <Input value={draft.centralRate} onChange={(event) => setDraft({ ...draft, centralRate: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Override rate</Label>
                <Input value={draft.overrideRate} onChange={(event) => setDraft({ ...draft, overrideRate: event.target.value })} />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              Final price {formatInr(finalEventPrice(Number(draft.quantity) || 0, Number(draft.overrideRate) || 0))}
            </p>
            <label className="space-y-1 text-sm">
              <Label>Source</Label>
              <select
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={draft.source}
                onChange={(event) => setDraft({ ...draft, source: event.target.value as "CENTRAL_INVENTORY" | "DIRECT_PURCHASE" })}
              >
                <option value="CENTRAL_INVENTORY">Central inventory</option>
                <option value="DIRECT_PURCHASE">Direct purchase</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <Label>Vehicle</Label>
              <Input value={draft.vehicleNumber} onChange={(event) => setDraft({ ...draft, vehicleNumber: event.target.value })} />
            </label>
            <Button type="submit" disabled={busy}>Save event</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
