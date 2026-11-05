"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/controllers/records";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { Field, Panel, Rows } from "@/views/site/panel";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";

const emptyForm = { name: "", companyName: "", phone: "", email: "", address: "", gstin: "" };

export function NewClientForm() {
  const router = useRouter();
  const confirm = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const accepted = await confirm({ title: "Save this client?", detail: "This adds the client to the office records." });
    if (!accepted) return;
    const result = await createClient(form);
    setNotice(result.message);
    if (result.success) {
      router.push("/clients");
      router.refresh();
    }
  }

  return (
    <PageFrame eyebrow="Work" title="New client" description="The client is available on projects and invoices after you save." width="narrow">
      <Panel title="Client">
        <form className="space-y-3" onSubmit={(event) => void save(event)}>
          <Rows>
            <Field label="Name"><Input aria-label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Company"><Input aria-label="Company" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></Field>
            <Field label="Phone"><Input aria-label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Email"><Input aria-label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Address"><Input aria-label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
            <Field label="GSTIN"><Input aria-label="GSTIN" value={form.gstin} onChange={(event) => setForm({ ...form, gstin: event.target.value })} /></Field>
          </Rows>
          <Button type="submit">Save</Button>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </form>
      </Panel>
    </PageFrame>
  );
}
