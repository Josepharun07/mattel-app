"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addProjectEntry, deleteProjectEntry, updateProject } from "@/controllers/records";
import type { EntryMaterial } from "@/models/projects";
import { formatInr } from "@/lib/money";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { RecordActions } from "@/views/shell/record-actions";
import { Field, Rows } from "@/views/site/panel";
import { Badge } from "@/views/ui/badge";

type ProjectDraft = {
  id: string;
  name: string;
  location: string;
  status: "ACTIVE" | "COMPLETED";
  clientIds: string[];
  active: boolean;
};

type ProjectEntry = {
  id: string;
  enteredAt: string;
  item: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ProjectInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  unpaid: number;
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid";
};

export function ProjectProfile({
  project,
  clients,
  entries,
  invoices = [],
  materials = [],
  admin = false,
}: {
  project: ProjectDraft | null;
  clients: { id: string; name: string }[];
  entries: ProjectEntry[];
  invoices?: ProjectInvoice[];
  materials?: EntryMaterial[];
  admin?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft | null>(project);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState({ source: "", item: "", description: "", quantity: "", unitPrice: "", enteredAt: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const inventory = materials.filter((item) => item.source === "inventory");
  const yard = materials.filter((item) => item.source === "yard");
  const manual = entry.source === "manual";
  const chosen = materials.find((item) => `${item.source}:${item.id}` === entry.source);
  const lineTotal = Number(entry.quantity) * Number(entry.unitPrice);
  const selectedIds = selected.filter((id) => entries.some((row) => row.id === id));
  const allSelected = entries.length > 0 && selectedIds.length === entries.length;

  if (!draft) {
    return <PageFrame eyebrow="Work" title="Project"><p className="text-sm text-muted-foreground">This project was not found.</p></PageFrame>;
  }

  const names = clients.filter((client) => draft.clientIds.includes(client.id)).map((client) => client.name);

  async function save() {
    if (!draft) return;
    const accepted = await confirm({ title: "Save this project?", detail: "This updates the project name, status, and assigned clients." });
    if (!accepted) return;
    setSaving(true);
    const result = await updateProject(draft.id, {
      name: draft.name,
      location: draft.location,
      status: draft.status,
      clientIds: draft.clientIds,
    });
    setNotice(result.message);
    if (result.success) {
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const accepted = await confirm({ title: "Add this work entry?", detail: "This line is kept with the project and can be used on an invoice." });
    if (!accepted) return;
    const result = await addProjectEntry(draft.id, {
      item: entry.item,
      description: entry.description,
      quantity: Number(entry.quantity),
      unitPrice: Number(entry.unitPrice),
      enteredAt: entry.enteredAt ? new Date(entry.enteredAt).toISOString() : undefined,
    });
    setNotice(result.message);
    if (result.success) {
      setEntry({ source: "", item: "", description: "", quantity: "", unitPrice: "", enteredAt: "" });
      router.refresh();
    }
  }

  async function removeEntry(entryId: string) {
    if (!draft) return;
    const accepted = await confirm({ title: "Remove this entry?", detail: "The line is taken off this project." });
    if (!accepted) return;
    const result = await deleteProjectEntry(draft.id, entryId);
    setNotice(result.message);
    if (result.success) router.refresh();
  }

  return (
    <PageFrame
      eyebrow="Work"
      title={draft.name || "Project"}
      action={editing ? null : <Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
    >
      <Rows>
        <Field label="Name">{editing ? <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <p>{draft.name || "—"}</p>}</Field>
        <Field label="Location">{editing ? <Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /> : <p>{draft.location || "—"}</p>}</Field>
        <Field label="Status">
          {editing ? (
            <select
              aria-label="Status"
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value === "COMPLETED" ? "COMPLETED" : "ACTIVE" })}
            >
              <option value="ACTIVE">Running</option>
              <option value="COMPLETED">Finished</option>
            </select>
          ) : (
            <p>{draft.status === "COMPLETED" ? "Finished" : "Running"}</p>
          )}
        </Field>
        {draft.status === "COMPLETED" ? null : (
        <Field label="Account">
          <Badge tone={draft.active === false ? "warning" : "success"}>{draft.active === false ? "Inactive" : "Active"}</Badge>
        </Field>
        )}
      </Rows>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Clients</h2>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {clients.map((client) => (
              <label key={client.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={draft.clientIds.includes(client.id)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      clientIds: draft.clientIds.includes(client.id)
                        ? draft.clientIds.filter((id) => id !== client.id)
                        : [...draft.clientIds, client.id],
                    })
                  }
                />
                {client.name}
              </label>
            ))}
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {names.length === 0 ? <li className="px-4 py-3 text-muted-foreground">No clients assigned.</li> : null}
            {clients.filter((client) => draft.clientIds.includes(client.id)).map((client) => (
              <li key={client.id} className="px-4 py-3">
                <button type="button" className="font-medium hover:underline" onClick={() => router.push(`/clients/${client.id}`)}>{client.name}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {admin ? (
        <RecordActions
          kind="project"
          id={draft.id}
          active={draft.active}
          label={draft.name}
          onChanged={(next) => setDraft({ ...draft, active: next })}
          showActive={draft.status !== "COMPLETED"}
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Invoices</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {invoices.length === 0 ? <li className="px-4 py-6 text-muted-foreground">No invoices for this project yet.</li> : null}
          {invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{invoice.invoiceNumber}</p>
                <p className="text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={invoice.paymentStatus === "Paid" ? "success" : invoice.paymentStatus === "Unpaid" ? "warning" : "warning"}>{invoice.paymentStatus}</Badge>
                <span>{formatInr(invoice.total)}</span>
                <span className="text-muted-foreground">Unpaid {formatInr(invoice.unpaid)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Work entries</h2>
            <p className="text-sm text-muted-foreground">These are the lines still waiting to be invoiced. Select the ones this invoice should include.</p>
          </div>
          {selectedIds.length > 0 ? (
            <Button type="button" onClick={() => router.push(`/invoices/create?project=${draft.id}&entries=${selectedIds.join(",")}`)}>Create invoice</Button>
          ) : null}
        </div>
        {admin ? (
          <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6" onSubmit={(event) => void addEntry(event)}>
            <Input aria-label="Date and time" type="datetime-local" value={entry.enteredAt} onChange={(event) => setEntry({ ...entry, enteredAt: event.target.value })} />
            <select
              aria-label="Item"
              className="h-9 w-full rounded-md border bg-white px-3 text-sm md:col-span-2"
              value={entry.source}
              onChange={(event) => {
                const source = event.target.value;
                const material = materials.find((item) => `${item.source}:${item.id}` === source);
                setEntry({
                  ...entry,
                  source,
                  item: material?.name ?? "",
                  unitPrice: material ? String(material.rate) : "",
                  description: material ? material.unit : "",
                });
              }}
            >
              <option value="">Choose an item</option>
              {inventory.length > 0 ? (
                <optgroup label="Inventory">
                  {inventory.map((item) => (
                    <option key={`inventory:${item.id}`} value={`inventory:${item.id}`}>{item.name} · {item.unit}</option>
                  ))}
                </optgroup>
              ) : null}
              {yard.length > 0 ? (
                <optgroup label="Yard materials">
                  {yard.map((item) => (
                    <option key={`yard:${item.id}`} value={`yard:${item.id}`}>{item.name} · {item.unit}</option>
                  ))}
                </optgroup>
              ) : null}
              <option value="manual">Enter manually</option>
            </select>
            {manual ? <Input aria-label="Item name" placeholder="Item" value={entry.item} onChange={(event) => setEntry({ ...entry, item: event.target.value })} /> : null}
            <Input aria-label="Description" placeholder="Description" value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} />
            <Input aria-label="Quantity" placeholder="Quantity" value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} />
            <Input aria-label="Unit price" placeholder="Unit price" value={entry.unitPrice} onChange={(event) => setEntry({ ...entry, unitPrice: event.target.value })} />
            <div className="flex items-center justify-between gap-3 md:col-span-6">
              <p className="text-sm text-muted-foreground">
                {chosen ? `${chosen.name} fills in at ${formatInr(chosen.rate)} each.` : manual ? "Type the item and its unit price." : "Pick an item, then enter the quantity."}
                {Number.isFinite(lineTotal) && entry.quantity && entry.unitPrice ? ` Total ${formatInr(lineTotal)}.` : ""}
              </p>
              <Button type="submit">Add entry</Button>
            </div>
          </form>
        ) : null}
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {entries.length === 0 ? <li className="px-4 py-6 text-muted-foreground">No work entries waiting to be invoiced.</li> : (
            <li className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all entries"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = selectedIds.length > 0 && !allSelected;
                }}
                onChange={() => setSelected(allSelected ? [] : entries.map((row) => row.id))}
              />
              <span className="font-medium">Select all</span>
            </li>
          )}
          {entries.map((row) => (
            <li key={row.id} className="grid gap-2 px-4 py-3 md:grid-cols-[auto_11rem_1fr_auto] md:items-center">
              <input
                type="checkbox"
                aria-label={`Select ${row.item}`}
                checked={selectedIds.includes(row.id)}
                onChange={() => setSelected(selectedIds.includes(row.id) ? selectedIds.filter((id) => id !== row.id) : [...selectedIds, row.id])}
              />
              <p className="text-muted-foreground">{new Date(row.enteredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              <div className="min-w-0">
                <p className="font-medium">{row.item}</p>
                {row.description ? <p className="text-muted-foreground">{row.description}</p> : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span>{row.quantity} × {formatInr(row.unitPrice)}</span>
                <span className="font-medium">{formatInr(row.total)}</span>
                {admin ? <Button type="button" size="sm" variant="outline" onClick={() => void removeEntry(row.id)}>Remove</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {editing ? (
        <div className="flex gap-2">
          <Button type="button" disabled={saving || draft.clientIds.length === 0} onClick={() => void save()}>{saving ? "Saving" : "Save"}</Button>
          <Button type="button" variant="outline" onClick={() => { setDraft(project); setEditing(false); }}>Cancel</Button>
        </div>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}
