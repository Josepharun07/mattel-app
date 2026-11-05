"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { usePageState } from "@/lib/navigation/page-memory";
import { createProject, setProjectStatus } from "@/actions/backend-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { Panel, Rows, Field } from "@/components/site/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProjectRow = {
  id: string;
  name: string;
  location: string;
  status: string;
  clientName: string;
};

export function ProjectsDesk({
  clients,
  projects,
}: {
  clients: { id: string; name: string }[];
  projects: ProjectRow[];
}) {
  const router = useRouter();
  const [notice, setNotice] = usePageState("notice", "");
  const [form, setForm] = usePageState("form", { clientId: clients[0]?.id ?? "", name: "", location: "" });
  const running = projects.filter((project) => project.status !== "COMPLETED");
  const finished = projects.filter((project) => project.status === "COMPLETED");

  async function add(event: FormEvent) {
    event.preventDefault();
    const result = await createProject({ clientId: form.clientId, name: form.name, location: form.location });
    setNotice(result.message);
    if (result.success) {
      setForm({ ...form, name: "", location: "" });
      router.refresh();
    }
  }

  async function mark(id: string, status: "ACTIVE" | "COMPLETED") {
    const result = await setProjectStatus(id, status);
    setNotice(result.message);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <PageFrame
      eyebrow="Work"
      title="Projects"
      description="Running jobs stay open for invoices. Finished jobs stay on the list so the record is still there."
      width="wide"
    >
      <Panel title="New project">
        <form className="space-y-3" onSubmit={(event) => void add(event)}>
          <Rows>
            <Field label="Client">
              <select
                aria-label="Client"
                className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                {clients.length === 0 ? <option value="">No clients yet</option> : null}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project name">
              <Input aria-label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Location">
              <Input aria-label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </Field>
          </Rows>
          <Button type="submit" disabled={!form.clientId}>Add project</Button>
        </form>
      </Panel>

      <ProjectList title="Running" empty="No running projects." rows={running} actionLabel="Mark finished" onAction={(id) => void mark(id, "COMPLETED")} />
      <ProjectList title="Finished" empty="No finished projects." rows={finished} actionLabel="Mark running" onAction={(id) => void mark(id, "ACTIVE")} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}

function ProjectList({
  title,
  empty,
  rows,
  actionLabel,
  onAction,
}: {
  title: string;
  empty: string;
  rows: ProjectRow[];
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {rows.length === 0 ? <li className="px-4 py-3 text-muted-foreground">{empty}</li> : null}
        {rows.map((project) => (
          <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="min-w-0">
              <span className="block font-medium">{project.name}</span>
              <span className="text-muted-foreground">{project.clientName}{project.location ? ` · ${project.location}` : ""}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tone={project.status === "COMPLETED" ? "success" : "neutral"}>{project.status === "COMPLETED" ? "Finished" : "Running"}</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => onAction(project.id)}>{actionLabel}</Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
