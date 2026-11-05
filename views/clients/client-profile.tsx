"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClient, setClientProjects } from "@/controllers/records";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { Badge } from "@/views/ui/badge";
import { RecordActions } from "@/views/shell/record-actions";
import { Field, Rows } from "@/views/site/panel";

export type ClientProfileData = {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  active: boolean;
};

export function ClientProfile({
  client,
  projects,
  assignedIds,
  admin = false,
}: {
  client: ClientProfileData | null;
  projects: { id: string; name: string; status: string }[];
  assignedIds: string[];
  admin?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientProfileData | null>(client);
  const [projectIds, setProjectIds] = useState(assignedIds);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  if (!draft) {
    return <PageFrame eyebrow="Work" title="Client"><p className="text-sm text-muted-foreground">This client was not found.</p></PageFrame>;
  }

  function toggleProject(id: string) {
    setProjectIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    if (!draft) return;
    const accepted = await confirm({ title: "Save this client?", detail: "This updates the client and the projects assigned to them." });
    if (!accepted) return;
    setSaving(true);
    const result = await updateClient(draft.id, draft);
    if (!result.success) {
      setNotice(result.message);
      setSaving(false);
      return;
    }
    const links = await setClientProjects(draft.id, projectIds);
    setNotice(links.message);
    if (links.success) {
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  const assigned = projects.filter((project) => projectIds.includes(project.id));

  return (
    <PageFrame
      eyebrow="Work"
      title={draft.name || "Client"}
      action={editing ? null : <Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
    >
      <Rows>
        <Field label="Name">{editing ? <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <p>{draft.name || "—"}</p>}</Field>
        <Field label="Company">{editing ? <Input value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} /> : <p>{draft.companyName || "—"}</p>}</Field>
        <Field label="Phone">{editing ? <Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /> : <p>{draft.phone || "—"}</p>}</Field>
        <Field label="Email">{editing ? <Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /> : <p>{draft.email || "—"}</p>}</Field>
        <Field label="Address">{editing ? <Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /> : <p>{draft.address || "—"}</p>}</Field>
        <Field label="GSTIN">{editing ? <Input value={draft.gstin} onChange={(event) => setDraft({ ...draft, gstin: event.target.value })} /> : <p>{draft.gstin || "—"}</p>}</Field>
        <Field label="Account">
          <Badge tone={draft.active === false ? "warning" : "success"}>{draft.active === false ? "Inactive" : "Active"}</Badge>
        </Field>
      </Rows>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Projects</h2>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet.</p> : null}
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <input type="checkbox" checked={projectIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
                {project.name}
              </label>
            ))}
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {assigned.length === 0 ? <li className="px-4 py-3 text-muted-foreground">No projects assigned.</li> : null}
            {assigned.map((project) => (
              <li key={project.id} className="flex items-center justify-between px-4 py-3">
                <button type="button" className="font-medium hover:underline" onClick={() => router.push(`/projects/${project.id}`)}>{project.name}</button>
                <span className="text-muted-foreground">{project.status === "COMPLETED" ? "Finished" : "Running"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {admin ? (
        <RecordActions
          kind="client"
          id={draft.id}
          active={draft.active}
          label={draft.name}
          onChanged={(next) => setDraft({ ...draft, active: next })}
        />
      ) : null}
      {editing ? (
        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving" : "Save"}</Button>
          <Button type="button" variant="outline" onClick={() => { setDraft(client); setProjectIds(assignedIds); setEditing(false); }}>Cancel</Button>
        </div>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}
