"use client";

import { useState, type FormEvent } from "react";
import { buildSettlementPreview } from "@/lib/payroll/settle";
import { closeSettlement } from "@/lib/engines/payroll-engine";
import { formatInr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdvancePaymentMode, AdvanceRow, AttendanceCell, SettlementRow, StaffMember } from "@/lib/payroll/types";

export function SettlementCard({
  person,
  attendance,
  advances,
  settlements,
  periodEnd,
  busy,
  onAdvance,
  onSettle,
}: {
  person: StaffMember;
  attendance: AttendanceCell[];
  advances: AdvanceRow[];
  settlements: SettlementRow[];
  periodEnd: string;
  busy: boolean;
  onAdvance: (amount: number, paymentMode: AdvancePaymentMode, notes: string) => Promise<void>;
  onSettle: (amount: number, notes: string) => Promise<void>;
}) {
  const preview = buildSettlementPreview({ staff: person, attendance, advances, settlements, endDate: periodEnd });
  const [amount, setAmount] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("500");
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

  async function issueAdvance(event: FormEvent) {
    event.preventDefault();
    await onAdvance(Number(advanceAmount), paymentMode, "Mid-cycle advance");
  }

  return (
    <article className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <h3 className="font-semibold">{person.fullName}</h3>
        <p className="text-xs text-muted-foreground">
          {preview.daysPresent} unsettled days through {periodEnd} · {preview.totalOvertimeHours} OT hours
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
      <Button type="button" disabled={busy} onClick={() => void onSettle(Number.isFinite(paying) ? paying : 0, notes)}>
        Complete settlement and issue slip
      </Button>
      <form className="flex flex-wrap items-end gap-2 border-t pt-3" onSubmit={issueAdvance}>
        <label className="space-y-1 text-sm">
          <Label>Advance</Label>
          <Input className="w-28 font-mono" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} />
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
        <Button type="submit" variant="outline" disabled={busy}>
          Issue advance
        </Button>
      </form>
    </article>
  );
}
