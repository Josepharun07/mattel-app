"use client";

import { useState } from "react";
import { sendEmployeeResetLink, setEmployeePassword } from "@/controllers/account-controls";
import { useConfirm } from "@/views/shell/confirm";
import { useToast } from "@/views/shell/toast";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";

export function PasswordReset({ staffId }: { staffId: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  async function save() {
    const accepted = await confirm({
      title: "Reset this password?",
      detail: "The employee will use this password the next time they sign in.",
    });
    if (!accepted) return;
    const result = await setEmployeePassword(staffId, password);
    toast(result.message, result.success);
    if (result.success) {
      setPassword("");
      setOpen(false);
    }
  }

  async function sendLink() {
    const accepted = await confirm({
      title: "Send a reset link?",
      detail: "The employee gets an email link that expires in one hour.",
    });
    if (!accepted) return;
    const result = await sendEmployeeResetLink(staffId, window.location.origin);
    toast(result.message, result.success);
  }

  return (
    <>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100"
          onClick={() => setOpen((current) => !current)}
        >
          Reset password
        </Button>
        {open ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-72 items-center gap-2 rounded-lg border bg-white p-2 shadow-lg">
            <Input aria-label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
            <Button type="button" className="shrink-0" onClick={() => void save()}>Save</Button>
          </div>
        ) : null}
      </div>
      <Button type="button" variant="outline" onClick={() => void sendLink()}>Send reset link</Button>
    </>
  );
}
