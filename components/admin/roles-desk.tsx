"use client";

import { useRouter } from "next/navigation";
import { usePageState } from "@/lib/navigation/page-memory";
import { createRoleAction, deleteRoleAction } from "@/actions/staff-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessRole } from "@/lib/settings/appearance";
import { canAssignStaffRoles, type StaffDirectory } from "@/lib/staff/directory";

export function RolesDesk({ directory, role }: { directory: StaffDirectory; role: AccessRole }) {
  const router = useRouter();
  const allowed = canAssignStaffRoles(role);
  const [name, setName] = usePageState("name", "");
  const [notice, setNotice] = usePageState("notice", "");

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
            void (async () => {
            const result = await createRoleAction(name);
            setNotice(result.ok ? `${result.role.name} added.` : result.message);
            if (result.ok) {
              setName("");
              router.refresh();
            }
            })();
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
          Only an owner or a super admin can create or assign roles.
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
                    void (async () => {
                      const result = await deleteRoleAction(role.id);
                      setNotice(result.ok ? "Role removed." : result.message);
                      if (result.ok) router.refresh();
                    })();
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
