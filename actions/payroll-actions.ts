"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendanceLogs, payrollSettlements, staff, staffAdvances } from "@/db/schema";
import { applyPayslipVersionSuffix, recalculateSettlement } from "@/lib/engines/payroll-engine";
import { dateKey, noonUtc, writeAccountSettlement, writeSettlement } from "@/lib/payroll/ledger";
import { buildSettlementPreview } from "@/lib/payroll/settle";
import { currentWeek } from "@/lib/payroll/range";
import { buildSamplePayroll } from "@/lib/payroll/sample";
import type {
  AdvancePaymentMode,
  AttendanceBatch,
  CheckoutType,
  PayrollDashboard,
  PayrollMutationResult,
  SettlementRow,
} from "@/lib/payroll/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const checkoutTypes = ["WEEKLY_CYCLED", "MID_WEEK_CHECKOUT"] as const;

const batchSchema = z.object({
  workDate: z.string().regex(datePattern),
  entries: z
    .array(
      z.object({
        staffId: z.string().min(1),
        isPresent: z.boolean(),
        overtimeHours: z.number().min(0).max(24),
      }),
    )
    .min(1),
});

const checkoutSchema = z.object({
  staffId: z.string().min(1),
  startDate: z.string().regex(datePattern),
  endDate: z.string().regex(datePattern),
  notes: z.string().trim().max(500).optional(),
});

function revalidatePayroll() {
  revalidatePath("/payroll");
  revalidatePath("/payroll/settlements");
}

function mapSettlement(row: {
  id: string;
  staffId: string;
  staffName: string;
  periodStart: Date;
  periodEnd: Date;
  daysPresent: string;
  totalOvertimeHours: string;
  basePay: string;
  overtimePay: string;
  grossPayable: string;
  grossEarned: string;
  priorBalanceCarryover: string;
  priorAdvanceCarryover: string;
  currentCycleAdvances: string;
  totalDeductions: string;
  netAmountDue: string;
  amountPaid: string;
  closingBalance: string;
  newBalanceCarryover: string;
  newAdvanceCarryover: string;
  checkoutType: CheckoutType;
  status: "PENDING" | "PAID";
  notes: string | null;
  basePayslipNumber: string;
  payslipNumber: string;
  version: number;
  createdAt: Date;
}): SettlementRow {
  return {
    id: row.id,
    staffId: row.staffId,
    staffName: row.staffName,
    periodStart: dateKey(row.periodStart),
    periodEnd: dateKey(row.periodEnd),
    daysPresent: Number(row.daysPresent),
    totalOvertimeHours: Number(row.totalOvertimeHours),
    basePay: Number(row.basePay),
    overtimePay: Number(row.overtimePay),
    grossPayable: Number(row.grossPayable),
    grossEarned: Number(row.grossEarned),
    priorBalanceCarryover: Number(row.priorBalanceCarryover),
    priorAdvanceCarryover: Number(row.priorAdvanceCarryover),
    currentCycleAdvances: Number(row.currentCycleAdvances),
    totalDeductions: Number(row.totalDeductions),
    netAmountDue: Number(row.netAmountDue),
    amountPaid: Number(row.amountPaid),
    closingBalance: Number(row.closingBalance),
    newBalanceCarryover: Number(row.newBalanceCarryover),
    newAdvanceCarryover: Number(row.newAdvanceCarryover),
    checkoutType: row.checkoutType,
    status: row.status,
    notes: row.notes,
    basePayslipNumber: row.basePayslipNumber,
    payslipNumber: row.payslipNumber,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadSettlements(): Promise<SettlementRow[]> {
  const rows = await db
    .select({
      id: payrollSettlements.id,
      staffId: payrollSettlements.staffId,
      staffName: staff.fullName,
      periodStart: payrollSettlements.periodStart,
      periodEnd: payrollSettlements.periodEnd,
      daysPresent: payrollSettlements.daysPresent,
      totalOvertimeHours: payrollSettlements.totalOvertimeHours,
      basePay: payrollSettlements.basePay,
      overtimePay: payrollSettlements.overtimePay,
      grossPayable: payrollSettlements.grossPayable,
      grossEarned: payrollSettlements.grossEarned,
      priorBalanceCarryover: payrollSettlements.priorBalanceCarryover,
      priorAdvanceCarryover: payrollSettlements.priorAdvanceCarryover,
      currentCycleAdvances: payrollSettlements.currentCycleAdvances,
      totalDeductions: payrollSettlements.totalDeductions,
      netAmountDue: payrollSettlements.netAmountDue,
      amountPaid: payrollSettlements.amountPaid,
      closingBalance: payrollSettlements.closingBalance,
      newBalanceCarryover: payrollSettlements.newBalanceCarryover,
      newAdvanceCarryover: payrollSettlements.newAdvanceCarryover,
      checkoutType: payrollSettlements.checkoutType,
      status: payrollSettlements.status,
      notes: payrollSettlements.notes,
      basePayslipNumber: payrollSettlements.basePayslipNumber,
      payslipNumber: payrollSettlements.payslipNumber,
      version: payrollSettlements.version,
      createdAt: payrollSettlements.createdAt,
    })
    .from(payrollSettlements)
    .innerJoin(staff, eq(staff.id, payrollSettlements.staffId))
    .orderBy(desc(payrollSettlements.createdAt));

  return rows.map(mapSettlement);
}

function mapAttendance(log: {
  id: string;
  staffId: string;
  workDate: Date;
  isPresent: boolean;
  overtimeHours: string;
  settlementId: string | null;
}) {
  return {
    id: log.id,
    staffId: log.staffId,
    workDate: dateKey(log.workDate),
    isPresent: log.isPresent,
    overtimeHours: Number(log.overtimeHours),
    settlementId: log.settlementId,
  };
}

async function loadDashboard(startDate: string, endDate: string): Promise<PayrollDashboard> {
  const [people, logs, earlier, settlements, advances] = await Promise.all([
    db.select().from(staff).where(isNull(staff.deletedAt)),
    db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          isNull(attendanceLogs.deletedAt),
          gte(attendanceLogs.workDate, new Date(`${startDate}T00:00:00.000Z`)),
          lte(attendanceLogs.workDate, new Date(`${endDate}T23:59:59.999Z`)),
        ),
      ),
    db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          isNull(attendanceLogs.deletedAt),
          isNull(attendanceLogs.settlementId),
          lt(attendanceLogs.workDate, new Date(`${startDate}T00:00:00.000Z`)),
        ),
      ),
    loadSettlements(),
    db
      .select({
        id: staffAdvances.id,
        staffId: staffAdvances.staffId,
        staffName: staff.fullName,
        requestDate: staffAdvances.requestDate,
        amount: staffAdvances.amount,
        paymentMode: staffAdvances.paymentMode,
        notes: staffAdvances.notes,
        settlementId: staffAdvances.settlementId,
        createdAt: staffAdvances.createdAt,
      })
      .from(staffAdvances)
      .innerJoin(staff, eq(staff.id, staffAdvances.staffId)),
  ]);

  return {
    periodStart: startDate,
    periodEnd: endDate,
    offline: false,
    staff: people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      role: person.role,
      dailyBaseRate: Number(person.dailyBaseRate),
      hourlyRate: Number(person.hourlyRate),
    })),
    attendance: logs.map(mapAttendance),
    earlierUnsettled: earlier.map(mapAttendance),
    settlements,
    advances: advances.map((row) => ({
      id: row.id,
      staffId: row.staffId,
      staffName: row.staffName,
      requestDate: dateKey(row.requestDate),
      amount: Number(row.amount),
      paymentMode: row.paymentMode,
      notes: row.notes,
      settlementId: row.settlementId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

function sampleFor(startDate: string, endDate: string) {
  const week = currentWeek();
  const start = datePattern.test(startDate) ? startDate : week.start;
  const end = datePattern.test(endDate) ? endDate : week.end;
  if (start > end) {
    return buildSamplePayroll(week.start, week.end);
  }
  return buildSamplePayroll(start, end);
}

export async function getWeeklyPayrollSummary(startDate: string, endDate: string): Promise<PayrollDashboard> {
  const sample = sampleFor(startDate, endDate);
  if (!process.env.DATABASE_URL) {
    return sample;
  }
  try {
    return await loadDashboard(sample.periodStart, sample.periodEnd);
  } catch {
    return sample;
  }
}

export async function getSettlementHistory(): Promise<SettlementRow[]> {
  if (!process.env.DATABASE_URL) {
    return buildSamplePayroll(currentWeek().start, currentWeek().end).settlements;
  }
  try {
    return await loadSettlements();
  } catch {
    return buildSamplePayroll(currentWeek().start, currentWeek().end).settlements;
  }
}

export async function logDailyAttendance(batchData: AttendanceBatch): Promise<PayrollMutationResult> {
  const parsed = batchSchema.safeParse(batchData);
  if (!parsed.success) {
    return { success: false, message: "Enter a work date, staff member, and overtime hours from 0 to 24." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. Attendance is kept in this session.",
    };
  }

  if (parsed.data.entries.some((entry) => !z.uuid().safeParse(entry.staffId).success)) {
    return { success: false, message: "Choose a saved staff member." };
  }

  let skipped = 0;
  try {
    for (const entry of parsed.data.entries) {
      const existing = await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.staffId, entry.staffId),
            isNull(attendanceLogs.deletedAt),
            gte(attendanceLogs.workDate, new Date(`${parsed.data.workDate}T00:00:00.000Z`)),
            lte(attendanceLogs.workDate, new Date(`${parsed.data.workDate}T23:59:59.999Z`)),
          ),
        );

      const row = existing[0];
      if (row?.settlementId) {
        skipped += 1;
        continue;
      }

      if (row) {
        await db
          .update(attendanceLogs)
          .set({
            isPresent: entry.isPresent,
            overtimeHours: entry.overtimeHours.toFixed(2),
          })
          .where(eq(attendanceLogs.id, row.id));
      } else {
        await db.insert(attendanceLogs).values({
          staffId: entry.staffId,
          workDate: noonUtc(parsed.data.workDate),
          isPresent: entry.isPresent,
          overtimeHours: entry.overtimeHours.toFixed(2),
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save attendance.";
    return { success: false, message };
  }

  revalidatePayroll();
  if (skipped === parsed.data.entries.length) {
    return { success: false, message: "Those days are already settled." };
  }
  return {
    success: true,
    message: skipped > 0 ? "Attendance saved. Settled days were left unchanged." : "Attendance saved.",
  };
}

async function settleOne(
  staffId: string,
  startDate: string,
  endDate: string,
  checkoutType: CheckoutType,
  notes?: string,
): Promise<PayrollMutationResult> {
  const parsed = checkoutSchema.safeParse({ staffId, startDate, endDate, notes });
  if (!parsed.success || !checkoutTypes.includes(checkoutType)) {
    return { success: false, message: "Choose a staff member and a valid date range." };
  }
  if (parsed.data.startDate > parsed.data.endDate) {
    return { success: false, message: "The start date must be on or before the end date." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. This payout is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.staffId).success) {
    return { success: false, message: "Choose a saved staff member." };
  }

  try {
    const result = await db.transaction((tx) =>
      writeSettlement(tx, {
        staffId: parsed.data.staffId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        checkoutType,
        notes: parsed.data.notes,
      }),
    );
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    revalidatePayroll();
    return {
      success: true,
      message: `${result.settlement.staffName} settled.`,
      settlement: result.settlement,
      settledLogIds: result.settledLogIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not settle payroll.";
    return { success: false, message };
  }
}

export async function executeMidWeekCheckout(
  staffId: string,
  startDate: string,
  endDate: string,
  notes?: string,
) {
  return settleOne(staffId, startDate, endDate, "MID_WEEK_CHECKOUT", notes);
}

export async function executeWeeklyStaffSettlement(staffId: string, startDate: string, endDate: string) {
  return settleOne(staffId, startDate, endDate, "WEEKLY_CYCLED", "Weekly payroll cycle");
}

export async function executeWeeklyPayrollCycle(periodEnd: string): Promise<PayrollMutationResult> {
  if (!datePattern.test(periodEnd)) {
    return { success: false, message: "Choose a valid period end." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. This weekly cycle is kept in this session.",
    };
  }

  try {
    const people = await db.select().from(staff).where(isNull(staff.deletedAt));
    const applied: { settlement: SettlementRow; settledLogIds: string[] }[] = [];
    for (const person of people) {
      const result = await db.transaction((tx) =>
        writeSettlement(tx, {
          staffId: person.id,
          startDate: "1970-01-01",
          endDate: periodEnd,
          checkoutType: "WEEKLY_CYCLED",
          notes: "Weekly payroll cycle",
        }),
      );
      if (result.ok) {
        applied.push({ settlement: result.settlement, settledLogIds: result.settledLogIds });
      }
    }
    revalidatePayroll();
    if (applied.length === 0) {
      return { success: false, message: "No unsettled attendance to pay." };
    }
    return {
      success: true,
      message: `Settled ${applied.length} staff member${applied.length === 1 ? "" : "s"}.`,
      applied,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run the weekly cycle.";
    return { success: false, message };
  }
}

const advanceModes = ["CASH", "UPI", "BANK_TRANSFER"] as const;

export async function issueStaffAdvance(
  staffId: string,
  amount: number,
  paymentMode: AdvancePaymentMode,
  notes?: string,
): Promise<PayrollMutationResult> {
  if (!staffId || !advanceModes.includes(paymentMode) || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "Enter a staff member, a payment mode, and an amount greater than zero." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. This advance is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(staffId).success) {
    return { success: false, message: "Choose a saved staff member." };
  }

  try {
    const [person] = await db.select().from(staff).where(and(eq(staff.id, staffId), isNull(staff.deletedAt)));
    if (!person) {
      return { success: false, message: "Staff member was not found." };
    }
    await db.insert(staffAdvances).values({
      staffId,
      amount: amount.toFixed(2),
      paymentMode,
      notes: notes?.trim() || null,
    });
    revalidatePayroll();
    return { success: true, message: `Advance of ${amount.toFixed(2)} recorded for ${person.fullName}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the advance.";
    return { success: false, message };
  }
}

export async function previewStaffSettlement(staffId: string, endDate: string) {
  if (!datePattern.test(endDate) || !staffId) {
    return { success: false as const, message: "Choose a staff member and a period end." };
  }
  const week = currentWeek();
  const dashboard = await getWeeklyPayrollSummary(week.start, endDate < week.start ? week.end : endDate);
  const person = dashboard.staff.find((row) => row.id === staffId);
  if (!person) {
    return { success: false as const, message: "Staff member was not found." };
  }
  const preview = buildSettlementPreview({
    staff: person,
    attendance: [...dashboard.earlierUnsettled, ...dashboard.attendance],
    advances: dashboard.advances,
    settlements: dashboard.settlements,
    endDate,
  });
  return { success: true as const, preview };
}

export async function executeStaffSettlement(
  staffId: string,
  endDate: string,
  manualAmountPaid: number,
  notes?: string,
): Promise<PayrollMutationResult> {
  if (!staffId || !datePattern.test(endDate) || !Number.isFinite(manualAmountPaid)) {
    return { success: false, message: "Enter the worker, period end, and the amount paying now." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      offline: true,
      message: "DATABASE_URL is not configured. This settlement is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(staffId).success) {
    return { success: false, message: "Choose a saved staff member." };
  }

  try {
    const result = await db.transaction((tx) =>
      writeAccountSettlement(tx, { staffId, endDate, manualAmountPaid, notes }),
    );
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    revalidatePayroll();
    return {
      success: true,
      message: `${result.settlement.staffName} settled.`,
      settlement: result.settlement,
      settledLogIds: result.settledLogIds,
      settledAdvanceIds: result.settledAdvanceIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete the settlement.";
    return { success: false, message };
  }
}

const settlementRevision = z.object({
  daysPresent: z.number().nonnegative(),
  totalOvertimeHours: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function updateFinalizedSettlement(
  settlementId: string,
  updatedPayload: z.infer<typeof settlementRevision>,
) {
  const parsed = settlementRevision.safeParse(updatedPayload);
  if (!settlementId || !parsed.success) {
    return { success: false as const, message: "Enter the revised days, overtime, and amount paid." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This slip revision stays in this session.",
    };
  }
  if (!z.uuid().safeParse(settlementId).success) {
    return { success: false as const, message: "Choose a saved payslip." };
  }

  try {
    const [existing] = await db
      .select()
      .from(payrollSettlements)
      .where(eq(payrollSettlements.id, settlementId));
    if (!existing) {
      return { success: false as const, message: "That payslip was not found." };
    }
    const [person] = await db.select().from(staff).where(eq(staff.id, existing.staffId));
    if (!person) {
      return { success: false as const, message: "Staff member was not found." };
    }

    const figures = recalculateSettlement({
      dailyBaseRate: Number(person.dailyBaseRate),
      hourlyRate: Number(person.hourlyRate),
      daysPresent: parsed.data.daysPresent,
      totalOvertimeHours: parsed.data.totalOvertimeHours,
      priorBalanceCarryover: Number(existing.priorBalanceCarryover),
      priorAdvanceCarryover: Number(existing.priorAdvanceCarryover),
      currentCycleAdvances: Number(existing.currentCycleAdvances),
      amountPaid: parsed.data.amountPaid,
    });
    const newVersion = existing.version + 1;
    const payslipNumber = applyPayslipVersionSuffix(existing.basePayslipNumber, newVersion);
    const money = (amount: number) => amount.toFixed(2);

    const [updated] = await db
      .update(payrollSettlements)
      .set({
        payslipNumber,
        version: newVersion,
        daysPresent: money(figures.daysPresent),
        totalOvertimeHours: money(figures.totalOvertimeHours),
        basePay: money(figures.basePay),
        overtimePay: money(figures.overtimePay),
        grossPayable: money(figures.grossPayable),
        grossEarned: money(figures.grossEarned),
        totalDeductions: money(figures.totalDeductions),
        netAmountDue: money(figures.netAmountDue),
        amountPaid: money(figures.amountPaid),
        closingBalance: money(figures.closingBalance),
        newBalanceCarryover: money(figures.newBalanceCarryover),
        newAdvanceCarryover: money(figures.newAdvanceCarryover),
        notes: parsed.data.notes?.trim() || existing.notes,
      })
      .where(eq(payrollSettlements.id, existing.id))
      .returning();

    revalidatePayroll();
    return {
      success: true as const,
      message: `Payslip revised to ${payslipNumber}.`,
      payslipNumber,
      version: newVersion,
      settlement: mapSettlement({
        ...updated,
        staffName: person.fullName,
        periodStart: updated.periodStart,
        periodEnd: updated.periodEnd,
        createdAt: updated.createdAt,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not revise the payslip.";
    return { success: false as const, message };
  }
}
