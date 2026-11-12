"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addProjectEntry } from "@/controllers/records";
import type { EntryMaterial } from "@/models/projects";
import { formatInr } from "@/lib/money";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { useConfirm } from "@/views/shell/confirm";

type Entry = {
  id: string;
  enteredAt: string;
  item: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function PickEntries({
  projectId,
  entries,
  materials,
}: {
  projectId: string;
  entries: Entry[];
  materials: EntryMaterial[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ source: "", item: "", description: "", quantity: "", unitPrice: "" });
  const [notice, setNotice] = useState("");
  const allSelected = entries.length > 0 && selected.length === entries.length;
  const inventory = materials.filter((item) => item.source === "inventory");
  const yard = materials.filter((item) => item.source === "yard");

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const accepted = await confirm({ title: "Add this work entry?", detail: "It is saved on the project and can be selected for this invoice." });
    if (!accepted) return;
    const result = await addProjectEntry(projectId, {
      item: draft.item,
      description: draft.description,
      quantity: Number(draft.quantity),
      unitPrice: Number(draft.unitPrice),
    });
    setNotice(result.message);
    if (result.success) {
      setDraft({ source: "", item: "", description: "", quantity: "", unitPrice: "" });
      setAdding(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? [] : entries.map((entry) => entry.id))}
            aria-label="Select all entries"
          />
          Select all
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setAdding((current) => !current)}>{adding ? "Close" : "Add entry"}</Button>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => router.push(`/invoices/compose?project=${projectId}&entries=${selected.join(",")}`)}
          >
            Continue
          </Button>
        </div>
      </div>
      {adding ? (
        <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6" onSubmit={(event) => void add(event)}>
          <select
            aria-label="Item"
            className="h-9 rounded-md border bg-white px-3 text-sm md:col-span-2"
            value={draft.source}
            onChange={(event) => {
              const source = event.target.value;
              const material = materials.find((item) => `${item.source}:${item.id}` === source);
              setDraft({
                ...draft,
                source,
                item: material?.name ?? "",
                unitPrice: material ? String(material.rate) : "",
                description: material ? material.unit : "",
              });
            }}
          >
            <option value="">Choose an item</option>
            {inventory.length > 0 ? <optgroup label="Inventory">{inventory.map((item) => <option key={item.id} value={`inventory:${item.id}`}>{item.name}</option>)}</optgroup> : null}
            {yard.length > 0 ? <optgroup label="Yard materials">{yard.map((item) => <option key={item.id} value={`yard:${item.id}`}>{item.name}</option>)}</optgroup> : null}
            <option value="manual">Enter manually</option>
          </select>
          {draft.source === "manual" ? <Input aria-label="Item name" placeholder="Item" value={draft.item} onChange={(event) => setDraft({ ...draft, item: event.target.value })} /> : null}
          <Input aria-label="Description" placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <Input aria-label="Quantity" placeholder="Quantity" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} />
          <Input aria-label="Unit price" placeholder="Unit price" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} />
          <Button type="submit" className="md:col-span-6 md:w-fit">Save entry</Button>
        </form>
      ) : null}
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {entries.length === 0 ? <li className="px-4 py-8 text-muted-foreground">No pending work entries. Add one to start this invoice.</li> : null}
        {entries.map((entry) => (
          <li key={entry.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
            <input type="checkbox" aria-label={`Select ${entry.item}`} checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} />
            <div className="min-w-0">
              <p className="font-medium">{entry.item}</p>
              <p className="text-muted-foreground">{new Date(entry.enteredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{entry.description ? ` · ${entry.description}` : ""}</p>
            </div>
            <p>{entry.quantity} × {formatInr(entry.unitPrice)} · {formatInr(entry.total)}</p>
          </li>
        ))}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
