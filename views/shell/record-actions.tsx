"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setClientActive, setEmployeeActive, setProjectActive } from "@/controllers/account-controls";
import { softDeleteClient, softDeleteProject, softDeleteStaff } from "@/controllers/records";
import { useConfirm } from "@/views/shell/confirm";
import { useToast } from "@/views/shell/toast";
import { Button } from "@/views/ui/button";

export function RecordActions({
  kind,
  id,
  active,
  label,
  onChanged,
  showActive = true,
}: {
  kind: "client" | "project" | "employee";
  id: string;
  active: boolean;
  label: string;
  onChanged?: (active: boolean) => void;
  showActive?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [current, setCurrent] = useState(active);
  useEffect(() => setCurrent(active), [active]);

  async function toggle() {
    const accepted = await confirm({
      title: current ? `Make this ${kind} inactive?` : `Make this ${kind} active?`,
      detail: current ? `${label} stays on file but cannot be used until an admin turns it back on.` : `${label} can be used again.`,
    });
    if (!accepted) return;
    const next = !current;
    const result = kind === "client" ? await setClientActive(id, next) : kind === "project" ? await setProjectActive(id, next) : await setEmployeeActive(id, next);
    toast(result.message, result.success);
    if (result.success) {
      setCurrent(next);
      onChanged?.(next);
      router.refresh();
    }
  }

  async function remove() {
    const accepted = await confirm({
      title: `Delete this ${kind}?`,
      detail: `${label} moves to the recycle bin. An admin can restore it from there.`,
    });
    if (!accepted) return;
    const result = kind === "client" ? await softDeleteClient(id) : kind === "project" ? await softDeleteProject(id) : await softDeleteStaff(id);
    toast(result.message, result.success);
    if (result.success) router.push(kind === "employee" ? "/staff" : kind === "client" ? "/clients" : "/projects");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showActive ? (
      <Button
        type="button"
        variant="outline"
        className={current ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}
        onClick={() => void toggle()}
      >
        {current ? "Make inactive" : "Make active"}
      </Button>
      ) : null}
      <Button type="button" variant="destructive" onClick={() => void remove()}>Delete</Button>
    </div>
  );
}
