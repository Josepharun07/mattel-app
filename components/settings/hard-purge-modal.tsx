"use client";

import { useState } from "react";
import { AlertOctagon, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PURGE_CONFIRMATION, confirmationMatches } from "@/lib/engines/governance-engine";

export function HardPurgeModal({
  open,
  title,
  detail,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  detail: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (confirmationText: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [seenOpen, setSeenOpen] = useState(open);
  if (open !== seenOpen) {
    setSeenOpen(open);
    setText("");
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#DC2626]">
            <AlertOctagon className="size-5" />
            Permanent deletion
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p>This removes the record from the database. It cannot be restored from the recycle bin.</p>
        </div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{detail}</p>
        <label className="mb-1 block text-xs font-medium" htmlFor="purge-confirmation">
          Type {PURGE_CONFIRMATION} to continue
        </label>
        <Input
          id="purge-confirmation"
          value={text}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmationMatches(text) || busy}
            onClick={() => {
              setBusy(true);
              void onConfirm(text).finally(() => setBusy(false));
            }}
          >
            Permanently delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
