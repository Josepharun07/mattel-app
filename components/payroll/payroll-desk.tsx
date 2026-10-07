"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, Clock, DollarSign, UserCheck } from "lucide-react";
import {
  executeMidWeekCheckout,
  executeStaffSettlement,
  executeWeeklyPayrollCycle,
  executeWeeklyStaffSettlement,
  getWeeklyPayrollSummary,
  issueStaffAdvance,
  logDailyAttendance,
} from "@/actions/payroll-actions";
import { AttendanceGrid } from "@/components/payroll/attendance-grid";
import { MidweekCheckoutModal } from "@/components/payroll/midweek-checkout-modal";
import { SettlementCard } from "@/components/payroll/settlement-card";
import { WeeklySummaryTable } from "@/components/payroll/weekly-summary-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInr } from "@/lib/money";
import { mergeById, mergeCells } from "@/lib/payroll/merge";
import { currentWeek, defaultCheckoutEnd, formatRangeLabel, listDates } from "@/lib/payroll/range";
import { readPayrollSession, serverPayrollSession, subscribePayrollSession, writePayrollSession } from "@/lib/payroll/session";
import { projectAccountSettlement, projectCheckout } from "@/lib/payroll/settle";
import { summarizePayroll } from "@/lib/payroll/summarize";
import type { AdvancePaymentMode, AdvanceRow, AttendanceCell, PayrollDashboard, PayrollSummaryRow, SettlementRow, StaffMember } from "@/lib/payroll/types";

type DeskState = {
  staff: StaffMember[];
  attendance: AttendanceCell[];
  earlierUnsettled: AttendanceCell[];
  settlements: SettlementRow[];
  advances: AdvanceRow[];
  range: { start: string; end: string };
};

export function PayrollDesk({ initial }: { initial: PayrollDashboard }) {
  const session = useSyncExternalStore(subscribePayrollSession, readPayrollSession, serverPayrollSession);
  const [override, setOverride] = useState<DeskState | null>(null);
  const [draftStart, setDraftStart] = useState(initial.periodStart);
  const [draftEnd, setDraftEnd] = useState(initial.periodEnd);
  const [checkoutStaff, setCheckoutStaff] = useState<StaffMember | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const staff = override?.staff ?? initial.staff;
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
          isPresent: row.isPresent,
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

  function stamp(settlement: SettlementRow, settledLogIds: string[], persist: boolean) {
    const ids = new Set(settledLogIds);
    const nextAttendance = attendance.map((cell) => (ids.has(cell.id) ? { ...cell, settlementId: settlement.id } : cell));
    const nextSettlements = mergeById(settlements, [settlement]);
    remember({ staff, attendance: nextAttendance, earlierUnsettled, settlements: nextSettlements, advances, range }, persist);
  }

  async function settlePerson(
    person: StaffMember,
    startDate: string,
    endDate: string,
    kind: "MID_WEEK_CHECKOUT" | "WEEKLY_CYCLED",
    notes?: string,
  ) {
    const saved = await persistAttendance(attendance);
    if (!saved.success && !saved.offline) {
      return { ok: false, message: saved.message };
    }
    const result =
      kind === "MID_WEEK_CHECKOUT"
        ? await executeMidWeekCheckout(person.id, startDate, endDate, notes)
        : await executeWeeklyStaffSettlement(person.id, startDate, endDate);
    if (result.success && result.settlement && result.settledLogIds) {
      stamp(result.settlement, result.settledLogIds, false);
      return { ok: true, message: `${person.fullName} settled · ${formatInr(result.settlement.grossPayable)}.` };
    }
    if (result.offline) {
      const projected = projectCheckout({
        staff: person,
        attendance,
        startDate,
        endDate,
        checkoutType: kind,
        notes,
        takenPayslips: settlements.map((row) => row.basePayslipNumber).filter(Boolean),
      });
      if (!projected.ok) {
        return projected;
      }
      stamp(projected.settlement, projected.settledLogIds, true);
      return { ok: true, message: `${person.fullName} settled · ${formatInr(projected.settlement.grossPayable)}. Kept in this session.` };
    }
    return { ok: false, message: result.message };
  }

  async function settleRow(row: PayrollSummaryRow) {
    const person = staff.find((item) => item.id === row.staffId);
    if (!person) {
      return;
    }
    setBusy(true);
    const result = await settlePerson(person, range.start, range.end, "WEEKLY_CYCLED");
    setNotice(result.message);
    setBusy(false);
  }

  async function confirmMidweek(startDate: string, endDate: string, notes: string) {
    if (!checkoutStaff) {
      return { ok: false, message: "Choose a worker." };
    }
    setBusy(true);
    const result = await settlePerson(checkoutStaff, startDate, endDate, "MID_WEEK_CHECKOUT", notes);
    setNotice(result.message);
    setBusy(false);
    return result;
  }

  async function runCycle() {
    setBusy(true);
    const saved = await persistAttendance(attendance);
    if (!saved.success && !saved.offline) {
      setNotice(saved.message);
      setBusy(false);
      return;
    }
    const result = await executeWeeklyPayrollCycle(range.end);
    if (result.success && result.applied) {
      let nextAttendance = attendance;
      let nextSettlements = settlements;
      for (const item of result.applied) {
        const ids = new Set(item.settledLogIds);
        nextAttendance = nextAttendance.map((cell) =>
          ids.has(cell.id) ? { ...cell, settlementId: item.settlement.id } : cell,
        );
        nextSettlements = mergeById(nextSettlements, [item.settlement]);
      }
      remember({ staff, attendance: nextAttendance, earlierUnsettled, settlements: nextSettlements, advances, range }, false);
      setNotice(result.message);
      setBusy(false);
      return;
    }
    if (result.offline) {
      let nextAttendance = attendance;
      const created: SettlementRow[] = [];
      const taken = settlements.map((row) => row.basePayslipNumber).filter(Boolean);
      for (const person of staff) {
        const projected = projectCheckout({
          staff: person,
          attendance: nextAttendance,
          startDate: "1970-01-01",
          endDate: range.end,
          checkoutType: "WEEKLY_CYCLED",
          notes: "Weekly payroll cycle",
          takenPayslips: [...taken, ...created.map((row) => row.basePayslipNumber)],
        });
        if (!projected.ok) {
          continue;
        }
        nextAttendance = projected.attendance;
        created.push(projected.settlement);
      }
      if (created.length === 0) {
        setNotice("No unsettled attendance to pay.");
        setBusy(false);
        return;
      }
      const nextSettlements = mergeById(settlements, created);
      remember({ staff, attendance: nextAttendance, earlierUnsettled, settlements: nextSettlements, advances, range }, true);
      setNotice(`Settled ${created.length} staff member${created.length === 1 ? "" : "s"}. Kept in this session.`);
      setBusy(false);
      return;
    }
    setNotice(result.message);
    setBusy(false);
  }

  async function issueAdvance(person: StaffMember, amount: number, paymentMode: AdvancePaymentMode, advanceNotes: string) {
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
    setBusy(true);
    const result = await executeStaffSettlement(person.id, range.end, amount, slipNotes);
    if (result.success && result.settlement) {
      applyAccount(result.settlement, result.settledLogIds ?? [], result.settledAdvanceIds ?? [], false);
      setNotice(`${person.fullName} settled · ${formatInr(result.settlement.amountPaid)} paid.`);
      setBusy(false);
      return;
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
      return;
    }
    setNotice(result.message);
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4" />
            {onCurrentWeek ? "Weekly cycle · Monday–Sunday" : "Custom range"}
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
        <Button type="button" disabled={busy} onClick={() => void runCycle()}>
          Run weekly cycle
        </Button>
        <Button variant="outline" asChild>
          <Link href="/payroll/settlements">Payout history</Link>
        </Button>
      </div>

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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Attendance</h2>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Settlement</h2>
        <p className="text-sm text-muted-foreground">
          Unsettled days and advances accumulate until the period end, including weeks that were not closed on time.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {staff.map((person) => (
            <SettlementCard
              key={person.id}
              person={person}
              attendance={settlementAttendance}
              advances={advances}
              settlements={settlements}
              periodEnd={range.end}
              busy={busy}
              onAdvance={(amount, paymentMode, advanceNotes) => issueAdvance(person, amount, paymentMode, advanceNotes)}
              onSettle={(amount, slipNotes) => completeSettlement(person, amount, slipNotes)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Weekly wages</h2>
        <WeeklySummaryTable
          rows={summary.rows}
          busy={busy}
          onMidWeek={(row) => setCheckoutStaff(staff.find((person) => person.id === row.staffId) ?? null)}
          onWeeklySettle={(row) => void settleRow(row)}
        />
      </section>

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      {checkoutStaff ? (
        <MidweekCheckoutModal
          key={`${checkoutStaff.id}-${range.start}-${range.end}`}
          staff={checkoutStaff}
          attendance={attendance}
          defaultStart={range.start}
          defaultEnd={defaultCheckoutEnd(range.start, range.end)}
          busy={busy}
          onClose={() => setCheckoutStaff(null)}
          onConfirm={confirmMidweek}
        />
      ) : null}
    </div>
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
