"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAccessRole } from "@/controllers/roles";
import { PageFrame } from "@/views/shell/page-frame";
import { useToast } from "@/views/shell/toast";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import type { AccessRoleRow } from "@/models/access-roles";

export function RolesDesk({ roles }: { roles: AccessRoleRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const label = name.trim();
    if (!label) {
      toast("Enter a role name.", false);
      return;
    }
    setSaving(true);
    const result = await createAccessRole(label);
    setSaving(false);
    if (!result.ok) {
      toast(result.message, false);
      return;
    }
    setName("");
    router.push(`/roles/${result.id}`);
  }

  return (
    <PageFrame
      eyebrow="Administration"
      title="Roles"
      description="Each employee is given one role. The role decides which pages they can open."
      width="wide"
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <Input aria-label="New role name" className="max-w-xs bg-white" placeholder="New role name" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={saving}>{saving ? "Creating" : "Create role"}</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Link key={role.id} href={`/roles/${role.id}`} className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-md">
            <p className="font-medium">{role.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {role.pages.length} {role.pages.length === 1 ? "page" : "pages"} · {role.employeeCount} {role.employeeCount === 1 ? "employee" : "employees"}
            </p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
