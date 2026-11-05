"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { usePageState } from "@/lib/navigation/page-memory";
import { createProject, setProjectStatus } from "@/controllers/records";
import { formatInr } from "@/lib/money";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { Panel, Rows, Field } from "@/views/site/panel";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/views/ui/card";
import { Input } from "@/views/ui/input";

export type ProjectRow = {
  id: string;
  name: string;
  location: string;
  status: string;
  active: boolean;
  clientNames: string[];
  unpaid: number;
  invoiceStatus: "Unpaid" | "Partially Paid" | "Paid" | "No invoice";
};

export function ProjectsDesk({
  clients,
  projects,
}: {
  clients: { id: string; name: string }[];
  projects: ProjectRow[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = usePageState("notice", "");
  const [form, setForm] = usePageState("form", { clientIds: clients[0] ? [clients[0].id] : [] as string[], name: "", location: "" });
  const running = projects.filter((project) => project.status !== "COMPLETED");
  const finished = projects.filter((project) => project.status === "COMPLETED");

  async function add(event: FormEvent) {
    event.preventDefault();
    const accepted = await confirm({ title: "Add this project?", detail: "This creates the project and links the selected clients." });
    if (!accepted) return;
    const result = await createProject({ clientIds: form.clientIds, name: form.name, location: form.location });
    setNotice(result.message);
    if (result.success) {
      setForm({ ...form, name: "", location: "" });
      setCreating(false);
      router.refresh();
    }
  }

  async function mark(id: string, status: "ACTIVE" | "COMPLETED") {
    const accepted = await confirm({
      title: status === "COMPLETED" ? "Mark this project finished?" : "Mark this project running?",
      detail: "This changes the project status on the office list.",
    });
    if (!accepted) return;
    const result = await setProjectStatus(id, status);
    setNotice(result.message);
    if (result.success) router.refresh();
  }

  return (
    <PageFrame
      eyebrow="Work"
      title="Projects"
      description="Open a project to see its details and the work entries that invoices are built from."
      width="wide"
      action={<Button type="button" onClick={() => setCreating((current) => !current)}>{creating ? "Close" : "New project"}</Button>}
    >
      {creating ? (
        <Panel title="New project">
          <form className="space-y-3" onSubmit={(event) => void add(event)}>
            <Rows>
              <Field label="Clients">
                <div className="flex flex-wrap gap-2">
                  {clients.length === 0 ? <p className="text-sm text-muted-foreground">No clients yet.</p> : null}
                  {clients.map((client) => (
                    <label key={client.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={form.clientIds.includes(client.id)}
                        onChange={() =>
                          setForm({
                            ...form,
                            clientIds: form.clientIds.includes(client.id)
                              ? form.clientIds.filter((id) => id !== client.id)
                              : [...form.clientIds, client.id],
                          })
                        }
                      />
                      {client.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Project name">
                <Input aria-label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field label="Location">
                <Input aria-label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </Field>
            </Rows>
            <Button type="submit" disabled={form.clientIds.length === 0}>Add project</Button>
          </form>
        </Panel>
      ) : null}

      <ProjectGrid title="Running" empty="No running projects." rows={running} actionLabel="Mark finished" onAction={(id) => void mark(id, "COMPLETED")} />
      <ProjectGrid title="Finished" empty="No finished projects." rows={finished} actionLabel="Mark running" onAction={(id) => void mark(id, "ACTIVE")} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}

function ProjectGrid({
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
  const router = useRouter();
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.length === 0 ? <p className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((project) => (
          <Card
            key={project.id}
            role="link"
            tabIndex={0}
            className="cursor-pointer gap-3 transition-[border-color,box-shadow,background-color] duration-150 hover:border-[var(--app-accent)] hover:bg-white hover:shadow-md focus-visible:border-[var(--app-accent)] focus-visible:shadow-md"
            onClick={() => router.push(`/projects/${project.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push(`/projects/${project.id}`);
            }}
          >
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <Badge className="self-start" tone={project.status === "COMPLETED" ? "success" : "neutral"}>{project.status === "COMPLETED" ? "Finished" : "Running"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{project.clientNames.join(", ") || "No clients"}</p>
              {project.location ? <p className="text-xs text-muted-foreground">{project.location}</p> : null}
              {project.status === "COMPLETED" ? null : (
                <Badge className="self-start" tone={project.active === false ? "warning" : "success"}>{project.active === false ? "Inactive" : "Active"}</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Unpaid remaining</span>
                <span className="font-medium">{formatInr(project.unpaid)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Invoice status</span>
                <Badge className="self-start" tone={project.invoiceStatus === "Paid" ? "success" : project.invoiceStatus === "No invoice" ? "neutral" : "warning"}>{project.invoiceStatus}</Badge>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction(project.id);
                }}
              >
                {actionLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
