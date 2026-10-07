"use client";

import { useState, type FormEvent } from "react";
import { ShieldAlert } from "lucide-react";
import { issueSubcontractDraw } from "@/actions/subcontract-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assessDraw, type DrawPaymentMode } from "@/lib/engines/subcontract-engine";
import { formatInr } from "@/lib/money";
import type { SubcontractRecord } from "@/lib/subcontracts/types";

const modes: DrawPaymentMode[] = ["CASH", "UPI", "BANK_TRANSFER"];

export function IssueDrawModal({
  contract,
  onClose,
  onIssued,
}: {
  contract: SubcontractRecord;
  onClose: () => void;
  onIssued: (result: { amountPaid: number; paymentMode: DrawPaymentMode; referenceNumber: string; notes: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<DrawPaymentMode>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const proposed = Number(amount);
  const guard = Number.isFinite(proposed) && amount.trim() !== "" ? assessDraw(contract.remainingBalance, proposed) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const check = assessDraw(contract.remainingBalance, proposed);
    if (!check.ok) {
      setMessage(check.message);
      return;
    }
    setBusy(true);
    const result = await issueSubcontractDraw({
      subcontractId: contract.id,
      amountPaid: proposed,
      paymentMode,
      referenceNumber,
      notes,
    });
    setBusy(false);
    if (!result.success && !result.offline) {
      setMessage(result.message);
      return;
    }
    onIssued({ amountPaid: proposed, paymentMode, referenceNumber, notes });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Advance draw · {contract.title}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm">Contract {formatInr(contract.totalContractAmount)}</p>
          <p className="text-sm">Drawn {formatInr(contract.totalAdvances)}</p>
          <p className="text-sm font-medium">Remaining {formatInr(contract.remainingBalance)}</p>
          <label className="space-y-1 text-sm">
            <Label>Amount paid</Label>
            <Input className="font-mono" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <Label>Payment mode</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as DrawPaymentMode)}>
              {modes.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <Label>Reference</Label>
            <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {guard && !guard.ok ? (
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <ShieldAlert className="size-4" />
              {guard.message}
            </p>
          ) : null}
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || Boolean(guard && !guard.ok)}>Record draw</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
