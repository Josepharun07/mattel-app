"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/actions/backend-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { Panel, Rows, Field } from "@/components/site/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ClientRow = {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
};

const emptyForm = { name: "", companyName: "", phone: "", email: "", address: "", gstin: "" };

export function ClientsDesk({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function add(event: FormEvent) {
    event.preventDefault();
    const result = await createClient(form);
    setNotice(result.message);
    if (result.success) {
      setForm(emptyForm);
      router.refresh();
    }
  }

  return (
    <PageFrame
      eyebrow="Work"
      title="Clients"
      description="Every project and invoice is raised for a client on this list."
      width="wide"
    >
      <Panel title="New client">
        <form className="space-y-3" onSubmit={(event) => void add(event)}>
          <Rows>
            <Field label="Name">
              <Input aria-label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Company">
              <Input aria-label="Company" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
            </Field>
            <Field label="Phone">
              <Input aria-label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </Field>
            <Field label="Email">
              <Input aria-label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </Field>
            <Field label="Address">
              <Input aria-label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
            <Field label="GSTIN">
              <Input aria-label="GSTIN" value={form.gstin} onChange={(event) => setForm({ ...form, gstin: event.target.value })} />
            </Field>
          </Rows>
          <Button type="submit">Add client</Button>
        </form>
      </Panel>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">All clients</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {clients.length === 0 ? <li className="px-4 py-3 text-muted-foreground">No clients yet.</li> : null}
          {clients.map((client) => (
            <li key={client.id} className="px-4 py-3">
              <p className="font-medium">{client.name}</p>
              <p className="text-muted-foreground">
                {[client.companyName, client.phone, client.email, client.address, client.gstin ? `GSTIN ${client.gstin}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}
