"use client";

import { useState } from "react";
import { buildSettlementPreview } from "@/lib/payroll/settle";
import { closeSettlement } from "@/lib/engines/payroll-engine";
import { formatInr } from "@/lib/money";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import type { AdvancePaymentMode, AdvanceRow, AttendanceCell, SettlementRow, StaffMember } from "@/lib/payroll/types";

export function SettlementCard({
  person,
  attendance,
  advances,
  settlements,
  periodEnd,
  busy,
  onAdvance,
  onSave,
  onSubmit,
}: {
  person: StaffMember;
  attendance: AttendanceCell[];
  advances: AdvanceRow[];
  settlements: SettlementRow[];
  periodEnd: string;
  busy: boolean;
  onAdvance: (amount: number, paymentMode: AdvancePaymentMode, notes: string) => Promise<void>;
  onSave: (amount: number, notes: string) => void;
  onSubmit: (amount: number, notes: string) => Promise<void>;
}) {
  const preview = buildSettlementPreview({ staff: person, attendance, advances, settlements, endDate: periodEnd });
  const [amount, setAmount] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [paymentMode, setPaymentMode] = useState<AdvancePaymentMode>("CASH");
  const paying = Number(amount ?? preview.netAmountDue);
  const live = closeSettlement({
    grossEarned: preview.grossEarned,
    priorBalanceCarryover: preview.priorBalanceCarryover,
    priorAdvanceCarryover: preview.priorAdvanceCarryover,
    currentCycleAdvances: preview.currentCycleAdvances,
    manualAmountPaid: Number.isFinite(paying) ? paying : 0,
  });
  const indicator =
    live.newBalanceCarryover > 0
      ? `Carryover balance ${formatInr(live.newBalanceCarryover)} owed next cycle`
      : live.newAdvanceCarryover > 0
        ? `New advance ${formatInr(live.newAdvanceCarryover)} carried to the next cycle`
        : "Account settles in full";

  async function save() {
    const advance = Number(advanceAmount);
    if (Number.isFinite(advance) && advance > 0) {
      await onAdvance(advance, paymentMode, "Mid-cycle advance");
      setAdvanceAmount("");
    }
    onSave(Number.isFinite(paying) ? paying : 0, notes);
    setSaved(true);
  }

  return (
    <article className="space-y-3">
      <div>
        <h3 className="font-semibold">{person.fullName}</h3>
        <p className="text-xs text-muted-foreground">
          {preview.daysPresent} unsettled days through {periodEnd} · {preview.totalOvertimeHours} overtime hours
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>Gross earned</div>
        <div className="text-right font-mono">{formatInr(preview.grossEarned)}</div>
        <div>Prior unpaid balance</div>
        <div className="text-right font-mono">{formatInr(preview.priorBalanceCarryover)}</div>
        <div>Advances</div>
        <div className="text-right font-mono">− {formatInr(preview.totalDeductions)}</div>
        <div className="font-medium">Net amount due</div>
        <div className="text-right font-mono font-medium">{formatInr(preview.netAmountDue)}</div>
      </dl>
      <label className="space-y-1 text-sm">
        <Label>Amount paying now</Label>
        <Input
          className="font-mono"
          type="number"
          step="0.01"
          value={amount ?? String(preview.netAmountDue)}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <p className="text-sm text-muted-foreground">{indicator}</p>
      <label className="space-y-1 text-sm">
        <Label>Slip note</Label>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="space-y-1 text-sm">
          <Label>Advance</Label>
          <Input className="w-28 font-mono" placeholder="0" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <Label>Mode</Label>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={paymentMode}
            onChange={(event) => setPaymentMode(event.target.value as AdvancePaymentMode)}
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save()}>Save</Button>
        <Button type="button" disabled={busy} onClick={() => void onSubmit(Number.isFinite(paying) ? paying : 0, notes)}>Submit</Button>
      </div>
      {saved ? <p className="text-sm text-muted-foreground">Saved on this settlement. Submit writes the payout and emails the payslip.</p> : null}
    </article>
  );
}
