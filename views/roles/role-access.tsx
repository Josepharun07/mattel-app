"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccessRole, saveAccessRole } from "@/controllers/roles";
import { rolePageGroups } from "@/lib/auth/access-roles";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { useToast } from "@/views/shell/toast";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { Switch } from "@/views/ui/switch";
import type { AccessRoleRow } from "@/models/access-roles";

export function RoleAccess({ role }: { role: AccessRoleRow }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(role.name);
  const [pages, setPages] = useState(role.pages);
  const [savedName, setSavedName] = useState(role.name);
  const [savedPages, setSavedPages] = useState(role.pages);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== savedName || pages.length !== savedPages.length || pages.some((page) => !savedPages.includes(page));

  function toggle(page: string, checked: boolean) {
    setPages((current) => checked ? [...current, page] : current.filter((item) => item !== page));
  }

  async function save() {
    if (!dirty) return;
    setSaving(true);
    const result = await saveAccessRole(role.id, name, pages);
    setSaving(false);
    toast(result.message, result.ok);
    if (!result.ok) return;
    setName(result.name);
    setPages(result.pages);
    setSavedName(result.name);
    setSavedPages(result.pages);
    router.refresh();
  }

  async function remove() {
    const accepted = await confirm({ title: "Remove this role?", detail: "Employees need another role before this one can be removed." });
    if (!accepted) return;
    setBusy(true);
    const result = await deleteAccessRole(role.id);
    setBusy(false);
    toast(result.message, result.ok);
    if (result.ok) router.push("/roles");
  }

  return (
    <PageFrame
      eyebrow="Roles"
      title={role.name}
      description={`${role.employeeCount} ${role.employeeCount === 1 ? "employee uses" : "employees use"} this role. Turn pages on or off, then save.`}
      width="wide"
      action={
        <div className="flex gap-2">
          {role.builtIn ? null : <Button type="button" variant="outline" disabled={busy || saving} onClick={() => void remove()}>Remove role</Button>}
          <Button
            type="button"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || saving}
            className={dirty ? "ring-2 ring-[var(--app-accent)] ring-offset-2" : undefined}
            onClick={() => void save()}
          >
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      }
    >
      <label className="block max-w-md space-y-2">
        <span className="text-xs text-muted-foreground">Role name</span>
        <Input aria-label="Role name" className="bg-white" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        {rolePageGroups.map((group) => (
          <section key={group.label} className="space-y-3 rounded-xl border bg-white p-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{group.label}</h2>
            {group.pages.map((page) => {
              const locked = role.slug === "super-admin" && page.id === "roles";
              return (
                <label key={page.id} className="flex items-center justify-between gap-3 text-sm">
                  {page.label}
                  <Switch
                    checked={pages.includes(page.id)}
                    disabled={locked}
                    onCheckedChange={(checked) => toggle(page.id, checked)}
                  />
                </label>
              );
            })}
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
