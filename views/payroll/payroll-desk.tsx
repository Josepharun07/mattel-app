"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { usePageState } from "@/lib/navigation/page-memory";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, Clock, DollarSign, UserCheck } from "lucide-react";
import {
  executeStaffSettlement,
  getWeeklyPayrollSummary,
  issueStaffAdvance,
  logDailyAttendance,
} from "@/controllers/payroll";
import { AttendanceGrid } from "@/views/payroll/attendance-grid";
import { SettlementCard } from "@/views/payroll/settlement-card";
import { SettlementDrawer } from "@/views/payroll/settlement-drawer";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { formatInr } from "@/lib/money";
import { mergeById, mergeCells } from "@/lib/payroll/merge";
import { currentWeek, formatRangeLabel, listDates } from "@/lib/payroll/range";
import { readPayrollSession, serverPayrollSession, subscribePayrollSession, writePayrollSession } from "@/lib/payroll/session";
import { buildSettlementPreview, projectAccountSettlement } from "@/lib/payroll/settle";
import { summarizePayroll } from "@/lib/payroll/summarize";
import type { AdvancePaymentMode, AdvanceRow, AttendanceCell, PayrollDashboard, SettlementRow, StaffMember } from "@/lib/payroll/types";

type DeskState = {
  staff: StaffMember[];
  attendance: AttendanceCell[];
  earlierUnsettled: AttendanceCell[];
  settlements: SettlementRow[];
  advances: AdvanceRow[];
  range: { start: string; end: string };
};

export function PayrollDesk({ initial, focus }: { initial: PayrollDashboard; focus: "attendance" | "payroll" }) {
  const router = useRouter();
  const confirm = useConfirm();
  const session = useSyncExternalStore(subscribePayrollSession, readPayrollSession, serverPayrollSession);
  const [override, setOverride] = useState<DeskState | null>(null);
  const [draftStart, setDraftStart] = usePageState("start", initial.periodStart);
  const [draftEnd, setDraftEnd] = usePageState("end", initial.periodEnd);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const staff = override?.staff ?? initial.staff;
  const settling = staff.find((person) => person.id === settlingId) ?? null;
  const range = override?.range ?? { start: initial.periodStart, end: initial.periodEnd };
  const attendance = mergeCells(override?.attendance ?? initial.attendance, session.cells);
  const earlierUnsettled = mergeCells(
    override?.earlierUnsettled ?? initial.earlierUnsettled,
    session.cells.filter((cell) => cell.workDate < range.start),
  );
  const settlements = mergeById(override?.settlements ?? initial.settlements, session.settlements);
  const advances = mergeById(override?.advances ?? initial.advances, session.advances);
  const settlementAttendance = mergeCells(earlierUnsettled, attendance);
  const monthKey = format(new Date(), "yyyy-MM");
  const summary = summarizePayroll(staff, attendance, settlements, range.start, range.end, monthKey);
  const dates = listDates(range.start, range.end);
  const gridDates = dates.length <= 14 ? dates : [];
  const week = currentWeek();
  const onCurrentWeek = range.start === week.start && range.end === week.end;

  function remember(next: DeskState, persist: boolean) {
    setOverride(next);
    if (persist) {
      writePayrollSession({
        cells: mergeCells(readPayrollSession().cells, [...next.attendance, ...next.earlierUnsettled]),
        settlements: mergeById(readPayrollSession().settlements, next.settlements),
        advances: next.advances,
      });
    }
  }

  function updateCell(cell: AttendanceCell) {
    if (cell.settlementId) {
      return;
    }
    setOverride({
      staff,
      attendance: mergeCells(attendance, [cell]),
      earlierUnsettled,
      settlements,
      advances,
      range,
    });
  }

  async function persistAttendance(rows: AttendanceCell[], active = range) {
    const datesToSave = [...new Set(rows.map((row) => row.workDate))].filter(
      (date) => date >= active.start && date <= active.end,
    );
    let offline = false;
    for (const workDate of datesToSave) {
      const entries = rows.filter((row) => row.workDate === workDate && !row.settlementId);
      if (entries.length === 0) {
        continue;
      }
      const result = await logDailyAttendance({
        workDate,
        entries: entries.map((row) => ({
          staffId: row.staffId,
          isPresent: (row.dayFraction ?? (row.isPresent ? 1 : 0)) > 0,
          dayFraction: row.dayFraction ?? (row.isPresent ? 1 : 0),
          overtimeHours: row.overtimeHours,
        })),
      });
      if (!result.success && !result.offline) {
        return result;
      }
      if (result.offline) {
        offline = true;
      }
    }
    if (offline) {
      writePayrollSession({
        cells: mergeCells(readPayrollSession().cells, rows),
        settlements: readPayrollSession().settlements,
        advances: readPayrollSession().advances,
      });
    }
    return { success: true, offline, message: offline ? "Attendance kept in this session." : "Attendance saved." };
  }

  async function saveAttendance() {
    const accepted = await confirm({ title: "Save this attendance?", detail: "This writes the presence and overtime for the open period." });
    if (!accepted) return;
    setBusy(true);
    const result = await persistAttendance(attendance);
    setNotice(result.message);
    setBusy(false);
  }

  async function showRange(start: string, end: string) {
    if (start > end) {
      setNotice("The start date must be on or before the end date.");
      return;
    }
    setBusy(true);
    const next = await getWeeklyPayrollSummary(start, end);
    setDraftStart(next.periodStart);
    setDraftEnd(next.periodEnd);
    setOverride({
      staff: next.staff,
      attendance: next.attendance,
      earlierUnsettled: next.earlierUnsettled,
      settlements: next.settlements,
      advances: next.advances,
      range: { start: next.periodStart, end: next.periodEnd },
    });
    setNotice(next.offline ? "Showing the session payroll book for this range." : "Payroll range updated.");
    setBusy(false);
  }

  async function issueAdvance(person: StaffMember, amount: number, paymentMode: AdvancePaymentMode, advanceNotes: string) {
    const accepted = await confirm({ title: "Record this advance?", detail: `This deducts the advance from ${person.fullName}'s next settlement.` });
    if (!accepted) return;
    setBusy(true);
    const result = await issueStaffAdvance(person.id, amount, paymentMode, advanceNotes);
    if (result.success || result.offline) {
      const row: AdvanceRow = {
        id: crypto.randomUUID(),
        staffId: person.id,
        staffName: person.fullName,
        requestDate: range.end,
        amount,
        paymentMode,
        notes: advanceNotes,
        settlementId: null,
        createdAt: new Date().toISOString(),
      };
      remember(
        { staff, attendance, earlierUnsettled, settlements, advances: mergeById(advances, [row]), range },
        Boolean(result.offline),
      );
    }
    setNotice(result.message);
    setBusy(false);
  }

  function applyAccount(settlement: SettlementRow, logIds: string[], advanceIds: string[], persist: boolean) {
    const logs = new Set(logIds);
    const paidAdvances = new Set(advanceIds);
    remember(
      {
        staff,
        attendance: attendance.map((cell) => (logs.has(cell.id) ? { ...cell, settlementId: settlement.id } : cell)),
        earlierUnsettled: earlierUnsettled.map((cell) => (logs.has(cell.id) ? { ...cell, settlementId: settlement.id } : cell)),
        settlements: mergeById(settlements, [settlement]),
        advances: advances.map((row) => (paidAdvances.has(row.id) ? { ...row, settlementId: settlement.id } : row)),
        range,
      },
      persist,
    );
  }

  async function completeSettlement(person: StaffMember, amount: number, slipNotes: string) {
    const accepted = await confirm({ title: "Submit this settlement?", detail: `This completes the payout for ${person.fullName} and emails the payslip.` });
    if (!accepted) return;
    setBusy(true);
    const result = await executeStaffSettlement(person.id, range.end, amount, slipNotes);
    if (result.success && result.settlement) {
      applyAccount(result.settlement, result.settledLogIds ?? [], result.settledAdvanceIds ?? [], false);
      setNotice(result.message);
      setBusy(false);
      return true;
    }
    if (result.offline) {
      const projected = projectAccountSettlement({
        staff: person,
        attendance: settlementAttendance,
        advances,
        settlements,
        endDate: range.end,
        manualAmountPaid: amount,
        notes: slipNotes,
      });
      if (!projected.ok) {
        setNotice(projected.message);
        setBusy(false);
        return;
      }
      applyAccount(projected.settlement, projected.settledLogIds, projected.settledAdvanceIds, true);
      setNotice(`${person.fullName} settled · ${formatInr(projected.settlement.amountPaid)} paid. Kept in this session.`);
      setBusy(false);
      return true;
    }
    setNotice(result.message);
    setBusy(false);
    return false;
  }

  const payrollRows = staff.map((person) => {
    const preview = buildSettlementPreview({
      staff: person,
      attendance: settlementAttendance,
      advances,
      settlements,
      endDate: range.end,
    });
    const paid = settlements
      .filter((row) => row.staffId === person.id && row.status === "PAID" && row.periodStart <= range.end && row.periodEnd >= range.start)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const stillOpen = preview.daysPresent > 0 || preview.totalOvertimeHours > 0 || preview.currentCycleAdvances > 0 || preview.priorAdvanceCarryover > 0 || preview.priorBalanceCarryover > 0;
    return { person, preview, paid, settled: Boolean(paid) && !stillOpen };
  });
  const openRows = payrollRows.filter((row) => !row.settled);
  const settledRows = payrollRows.filter((row) => row.settled);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4" />
            {onCurrentWeek ? "Week · Sunday–Saturday" : "Custom range"}
          </p>
          <p className="text-xs text-muted-foreground">{formatRangeLabel(range.start, range.end)}</p>
        </div>
        <label className="space-y-1 text-sm">
          <Label>From</Label>
          <Input type="date" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <Label>To</Label>
          <Input type="date" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} />
        </label>
        <Button type="button" variant="outline" disabled={busy} onClick={() => showRange(draftStart, draftEnd)}>
          Show range
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const next = currentWeek();
            setDraftStart(next.start);
            setDraftEnd(next.end);
            void showRange(next.start, next.end);
          }}
        >
          This week
        </Button>
        {focus === "payroll" ? (
          <Button variant="outline" asChild>
            <Link href="/payroll/settlements">Payout history</Link>
          </Button>
        ) : null}
      </div>

      {focus === "payroll" ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<UserCheck className="size-4" />} label="Active staff" value={String(summary.activeStaff)} />
        <Metric icon={<Clock className="size-4" />} label="Unsettled hours" value={String(summary.unsettledHours)} hint="8 hours per present day plus overtime" />
        <Metric icon={<DollarSign className="size-4" />} label="Pending payroll" value={formatInr(summary.pendingPayroll)} />
        <Metric
          icon={<CheckCircle2 className="size-4" />}
          label="Settled this month"
          value={formatInr(summary.settledThisMonth)}
          badge={summary.settledThisMonth > 0 ? <Badge tone="success">Paid</Badge> : undefined}
        />
      </div>
      ) : null}

      {focus === "attendance" ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Daily register</h2>
            <p className="text-sm text-muted-foreground">Sunday starts off. Mark it only when someone works. A full day is 8 hours, a half day is half the daily rate, and overtime is extra.</p>
          </div>
          <Button type="button" disabled={busy || gridDates.length === 0} onClick={() => void saveAttendance()}>
            Save attendance
          </Button>
        </div>
        {dates.length > 14 ? (
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle className="size-4" />
            Narrow the range to 14 days to use the attendance matrix.
          </p>
        ) : (
          <AttendanceGrid staff={staff} dates={gridDates} attendance={attendance} onChange={updateCell} />
        )}
      </section>
      ) : null}

      {focus === "payroll" ? (
      <>
      <PayrollGroup
        title="To settle"
        detail="Settle one person, then move to the next. Sunday hours count only when attendance shows they worked."
        rows={openRows}
        empty="Everyone in this week is settled."
        action={(person) => <Button type="button" size="sm" disabled={busy} onClick={() => setSettlingId(person.id)}>Settle</Button>}
        onOpen={(person) => router.push(`/payroll/${person.id}`)}
      />
      <PayrollGroup
        title="Settled"
        detail="Payouts already completed for this week."
        rows={settledRows}
        empty="No one has been settled for this week yet."
        action={() => <Badge tone="success">Paid</Badge>}
        onOpen={(person) => router.push(`/payroll/${person.id}`)}
      />
      </>
      ) : null}

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      {settling ? (
        <SettlementDrawer title={settling.fullName} onClose={() => setSettlingId(null)}>
          <SettlementCard
            key={settling.id}
            person={settling}
            attendance={settlementAttendance}
            advances={advances}
            settlements={settlements}
            periodEnd={range.end}
            busy={busy}
            onAdvance={(amount, paymentMode, advanceNotes) => issueAdvance(settling, amount, paymentMode, advanceNotes)}
            onSave={() => setNotice(`Saved ${settling.fullName}. Submit when the payout is ready.`)}
            onSubmit={async (amount, slipNotes) => {
              const done = await completeSettlement(settling, amount, slipNotes);
              if (done) setSettlingId(null);
            }}
          />
        </SettlementDrawer>
      ) : null}
    </div>
  );
}

function PayrollGroup({
  title,
  detail,
  rows,
  empty,
  action,
  onOpen,
}: {
  title: string;
  detail: string;
  rows: {
    person: StaffMember;
    preview: { daysPresent: number; totalOvertimeHours: number; grossEarned: number; totalDeductions: number; netAmountDue: number };
    paid?: SettlementRow;
    settled: boolean;
  }[];
  empty: string;
  action: (person: StaffMember) => ReactNode;
  onOpen: (person: StaffMember) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      {rows.length === 0 ? <p className="rounded-xl border bg-white px-4 py-6 text-sm text-muted-foreground">{empty}</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Overtime hours</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Advances</th>
                <th className="px-4 py-3 font-medium">{rows[0]?.settled ? "Paid" : "Net due"}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const days = row.settled ? row.paid?.daysPresent ?? 0 : row.preview.daysPresent;
                const overtime = row.settled ? row.paid?.totalOvertimeHours ?? 0 : row.preview.totalOvertimeHours;
                const gross = row.settled ? row.paid?.grossEarned ?? 0 : row.preview.grossEarned;
                const advancesPaid = row.settled ? row.paid?.totalDeductions ?? 0 : row.preview.totalDeductions;
                const money = row.settled ? row.paid?.amountPaid ?? 0 : row.preview.netAmountDue;
                return (
                  <tr key={row.person.id} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50" onClick={() => onOpen(row.person)}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.person.fullName}</p>
                      <p className="text-xs text-muted-foreground">{row.person.role}</p>
                    </td>
                    <td className="px-4 py-3">{days}</td>
                    <td className="px-4 py-3">{overtime}</td>
                    <td className="px-4 py-3 font-mono">{formatInr(gross)}</td>
                    <td className="px-4 py-3 font-mono">{formatInr(advancesPaid)}</td>
                    <td className="px-4 py-3 font-mono font-medium">{formatInr(money)}</td>
                    <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>{action(row.person)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xl font-semibold">{value}</p>
        {badge}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
