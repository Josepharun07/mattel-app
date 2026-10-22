"use client";

import { useState } from "react";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canAssignStaffRoles } from "@/lib/staff/directory";
import { addJobRole, deleteJobRole, useStaffDirectory } from "@/lib/staff/session";
import { useWorkspace } from "@/lib/workspace/store";

export function RolesDesk() {
  const directory = useStaffDirectory();
  const workspace = useWorkspace();
  const allowed = canAssignStaffRoles(workspace.role);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <PageFrame
      eyebrow="Administration"
      title="Roles"
      description="Manager, supervisor, mason, helper, operator, driver, heavy vehicle driver, owner, and admin are already on the list. An owner or a super admin can add another role. One person can hold several."
      width="narrow"
    >
      {allowed ? (
        <form
          className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = addJobRole(name, workspace.role);
            setNotice(result.ok ? `${result.role.name} added.` : result.message);
            if (result.ok) {
              setName("");
            }
          }}
        >
          <label className="min-w-48 flex-1 space-y-1 text-sm">
            <Label htmlFor="role-name">New role</Label>
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <Button type="submit">Create role</Button>
        </form>
      ) : (
        <p className="rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
          Signed in as {workspace.users.find((person) => person.id === workspace.currentUserId)?.name}. Only an owner or a super admin can create or assign roles.
        </p>
      )}
      <ul className="divide-y rounded-xl border bg-white">
        {directory.roles.map((role) => {
          const used = directory.staff.filter((person) => !person.deletedAt && person.roleIds.includes(role.id)).length;
          return (
            <li key={role.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{role.name}</span>
                <span className="ml-2 text-muted-foreground">{used} assigned</span>
              </span>
              {allowed && !role.builtIn ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const result = deleteJobRole(role.id, workspace.role);
                    setNotice(result.ok ? `${role.name} removed.` : result.message);
                  }}
                >
                  Remove
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{role.builtIn ? "Built in" : ""}</span>
              )}
            </li>
          );
        })}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}
