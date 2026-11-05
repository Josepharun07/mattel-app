"use client";

import { useState, type FormEvent } from "react";
import { recordResortPayment } from "@/controllers/resort";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/views/ui/dialog";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { paymentStatusLabel, resortPaymentStatus, resortRemainingBalance } from "@/lib/engines/resort-engine";
import { formatInr } from "@/lib/money";
import type { ResortInvoice } from "@/lib/resort/types";

const modes = ["BANK_TRANSFER", "UPI", "CHEQUE"] as const;

export function RecordPaymentModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: ResortInvoice;
  onClose: () => void;
  onRecorded: (result: { amountPaid: number; paymentMode: string; referenceNumber: string; notes: string }) => void;
}) {
  const confirm = useConfirm();
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<(typeof modes)[number]>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const proposed = Number(amount);
  const nextPaid = invoice.amountPaid + (Number.isFinite(proposed) ? proposed : 0);
  const preview = resortPaymentStatus(invoice.grandTotal, nextPaid);
  const remaining = resortRemainingBalance(invoice.grandTotal, invoice.amountPaid);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const accepted = await confirm({ title: "Record this collection?", detail: "This adds the payment to the lease invoice." });
    if (!accepted) return;
    if (!Number.isFinite(proposed) || proposed <= 0) {
      setMessage("Enter a collection amount.");
      return;
    }
    setBusy(true);
    const result = await recordResortPayment({
      invoiceId: invoice.id,
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
    onRecorded({ amountPaid: proposed, paymentMode, referenceNumber, notes });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm">{invoice.propertyName} · {invoice.billingPeriod}</p>
          <p className="text-sm">Outstanding {formatInr(Math.max(0, remaining))}</p>
          <div className="flex items-center gap-2 text-sm">
            <span>Status after this collection</span>
            <Badge tone={preview === "PAID" ? "success" : preview === "PARTIALLY_PAID" ? "warning" : "neutral"}>
              {paymentStatusLabel(preview)}
            </Badge>
          </div>
          <label className="space-y-1 text-sm">
            <Label>Amount</Label>
            <Input className="font-mono" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <Label>Payment mode</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as (typeof modes)[number])}>
              {modes.map((mode) => (
                <option key={mode} value={mode}>{mode === "BANK_TRANSFER" ? "Bank transfer" : mode === "UPI" ? "UPI" : "Cheque"}</option>
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
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Record collection</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
