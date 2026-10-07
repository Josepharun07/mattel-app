"use client";

import { useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import { generateResortMonthlyInvoice } from "@/actions/resort-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { dueDateForBillingPeriod, formatBillingPeriod, nextResortInvoiceNumber, resortInvoiceTotals } from "@/lib/engines/resort-engine";
import { formatInr } from "@/lib/money";
import type { ResortLease } from "@/lib/resort/types";

export function GenerateLeaseInvoiceModal({
  lease,
  existingNumbers,
  onClose,
  onIssued,
}: {
  lease: ResortLease;
  existingNumbers: string[];
  onClose: () => void;
  onIssued: (result: { billingPeriod: string; issueDate: string; dueDate: string; notes: string; gstEnabled: boolean; grandTotal: number }) => void;
}) {
  const opening = format(new Date(), "yyyy-MM");
  const [month, setMonth] = useState(opening);
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(() => {
    const [year, monthIndex] = opening.split("-").map(Number);
    return dueDateForBillingPeriod(year, monthIndex - 1, lease.billingDueDay);
  });
  const [notes, setNotes] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [year, monthIndex] = month.split("-").map(Number);
  const billingPeriod = Number.isFinite(year) && Number.isFinite(monthIndex) ? formatBillingPeriod(year, monthIndex - 1) : "";
  const previewNumber = nextResortInvoiceNumber(existingNumbers, issueDate);
  const totals = resortInvoiceTotals(lease.monthlyRentAmount, gstEnabled);

  function changeMonth(value: string) {
    setMonth(value);
    const [nextYear, nextMonth] = value.split("-").map(Number);
    if (Number.isFinite(nextYear) && Number.isFinite(nextMonth)) {
      setDueDate(dueDateForBillingPeriod(nextYear, nextMonth - 1, lease.billingDueDay));
      setIssueDate(format(parseISO(`${value}-01`), "yyyy-MM-dd"));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await generateResortMonthlyInvoice({
      leaseId: lease.id,
      billingPeriod,
      issueDate,
      dueDate,
      notes,
      gstEnabled,
    });
    setBusy(false);
    if (!result.success && !result.offline) {
      setMessage(result.message);
      return;
    }
    onIssued({ billingPeriod, issueDate, dueDate, notes, gstEnabled, grandTotal: totals.total });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monthly invoice · {lease.propertyName}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm">{lease.operatorName} · {lease.operatorContact}</p>
          <p className="font-mono text-sm">Rent {formatInr(lease.monthlyRentAmount)}</p>
          <p className="font-mono text-sm">Invoice {previewNumber}</p>
          <label className="space-y-1 text-sm">
            <Label>Billing period</Label>
            <Input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} required />
          </label>
          <p className="text-sm text-muted-foreground">{billingPeriod}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <Label>Issue date</Label>
              <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
            </label>
            <label className="space-y-1 text-sm">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
            </label>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>GST applicable</span>
            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
          </label>
          <p className="text-sm">Total {formatInr(totals.total)}{gstEnabled ? " including CGST and SGST" : ""}</p>
          <label className="space-y-1 text-sm">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Issue {previewNumber}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
