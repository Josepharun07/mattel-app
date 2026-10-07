import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import type { Database } from "@/db";
import { attendanceLogs, payrollSettlements, staff, staffAdvances } from "@/db/schema";
import { calculateRangePayroll, closeSettlement, issuePayslipNumber } from "@/lib/engines/payroll-engine";
import { roundMoney } from "@/lib/money";
import { buildSettlementPreview } from "@/lib/payroll/settle";
import type { AdvanceRow, CheckoutType, SettlementRow } from "@/lib/payroll/types";

type QueryExecutor = Pick<Database, "select" | "insert" | "update">;

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

async function allocatePayslip(executor: QueryExecutor, settlementDate: Date) {
  const rows = await executor
    .select({ basePayslipNumber: payrollSettlements.basePayslipNumber })
    .from(payrollSettlements);
  return issuePayslipNumber(
    rows.map((row) => row.basePayslipNumber),
    settlementDate,
  );
}

export function noonUtc(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function dateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export async function writeSettlement(
  executor: QueryExecutor,
  input: {
    staffId: string;
    startDate: string;
    endDate: string;
    checkoutType: CheckoutType;
    notes?: string;
  },
) {
  const [person] = await executor
    .select()
    .from(staff)
    .where(and(eq(staff.id, input.staffId), isNull(staff.deletedAt)));

  if (!person) {
    return { ok: false as const, message: "Staff member was not found." };
  }

  const logs = await executor
    .select()
    .from(attendanceLogs)
    .where(
      and(
        eq(attendanceLogs.staffId, input.staffId),
        isNull(attendanceLogs.deletedAt),
        isNull(attendanceLogs.settlementId),
        gte(attendanceLogs.workDate, new Date(`${input.startDate}T00:00:00.000Z`)),
        lte(attendanceLogs.workDate, new Date(`${input.endDate}T23:59:59.999Z`)),
      ),
    );

  const payroll = calculateRangePayroll(
    Number(person.dailyBaseRate),
    Number(person.hourlyRate),
    logs.map((log) => ({
      workDate: dateKey(log.workDate),
      isPresent: log.isPresent,
      overtimeHours: Number(log.overtimeHours),
      settlementId: log.settlementId,
    })),
    input.startDate,
    input.endDate,
  );

  if (payroll.daysPresent === 0 && payroll.totalOvertimeHours === 0) {
    return { ok: false as const, message: "No payable attendance in that range." };
  }

  const closing = closeSettlement({
    grossEarned: payroll.grossPayable,
    priorBalanceCarryover: 0,
    priorAdvanceCarryover: 0,
    currentCycleAdvances: 0,
  });
  const slip = await allocatePayslip(executor, new Date());

  const [created] = await executor
    .insert(payrollSettlements)
    .values({
      staffId: person.id,
      ...slip,
      periodStart: noonUtc(input.startDate),
      periodEnd: noonUtc(input.endDate),
      daysPresent: money(payroll.daysPresent),
      totalOvertimeHours: money(payroll.totalOvertimeHours),
      basePay: money(payroll.basePay),
      overtimePay: money(payroll.overtimePay),
      grossPayable: money(payroll.grossPayable),
      grossEarned: money(closing.grossEarned),
      priorBalanceCarryover: money(closing.priorBalanceCarryover),
      priorAdvanceCarryover: money(closing.priorAdvanceCarryover),
      currentCycleAdvances: money(closing.currentCycleAdvances),
      totalDeductions: money(closing.totalDeductions),
      netAmountDue: money(closing.netAmountDue),
      amountPaid: money(closing.amountPaid),
      closingBalance: money(closing.closingBalance),
      newBalanceCarryover: money(closing.newBalanceCarryover),
      newAdvanceCarryover: money(closing.newAdvanceCarryover),
      checkoutType: input.checkoutType,
      status: "PAID",
      notes: input.notes?.trim() || null,
    })
    .returning();

  const settledLogIds = logs.map((log) => log.id);
  if (settledLogIds.length > 0) {
    await executor
      .update(attendanceLogs)
      .set({ settlementId: created.id })
      .where(inArray(attendanceLogs.id, settledLogIds));
  }

  const createdAt = created.createdAt instanceof Date ? created.createdAt : new Date(created.createdAt);
  const settlement: SettlementRow = {
    id: created.id,
    staffId: person.id,
    staffName: person.fullName,
    periodStart: input.startDate,
    periodEnd: input.endDate,
    daysPresent: payroll.daysPresent,
    totalOvertimeHours: payroll.totalOvertimeHours,
    basePay: payroll.basePay,
    overtimePay: payroll.overtimePay,
    grossPayable: payroll.grossPayable,
    ...closing,
    checkoutType: input.checkoutType,
    status: "PAID",
    notes: input.notes?.trim() || null,
    basePayslipNumber: created.basePayslipNumber,
    payslipNumber: created.payslipNumber,
    version: created.version,
    createdAt: createdAt.toISOString(),
  };

  return { ok: true as const, settlement, settledLogIds };
}

export async function writeAccountSettlement(
  executor: QueryExecutor,
  input: { staffId: string; endDate: string; manualAmountPaid: number; notes?: string },
) {
  const [person] = await executor
    .select()
    .from(staff)
    .where(and(eq(staff.id, input.staffId), isNull(staff.deletedAt)));

  if (!person) {
    return { ok: false as const, message: "Staff member was not found." };
  }

  const logs = await executor
    .select()
    .from(attendanceLogs)
    .where(
      and(
        eq(attendanceLogs.staffId, person.id),
        isNull(attendanceLogs.deletedAt),
        isNull(attendanceLogs.settlementId),
        lte(attendanceLogs.workDate, new Date(`${input.endDate}T23:59:59.999Z`)),
      ),
    );
  const advances = await executor
    .select()
    .from(staffAdvances)
    .where(and(eq(staffAdvances.staffId, person.id), isNull(staffAdvances.settlementId)));
  const previous = await executor
    .select()
    .from(payrollSettlements)
    .where(eq(payrollSettlements.staffId, person.id))
    .orderBy(desc(payrollSettlements.createdAt))
    .limit(1);

  const last = previous[0];
  const advanceRows: AdvanceRow[] = advances.map((row) => ({
    id: row.id,
    staffId: row.staffId,
    staffName: person.fullName,
    requestDate: dateKey(row.requestDate),
    amount: Number(row.amount),
    paymentMode: row.paymentMode,
    notes: row.notes,
    settlementId: row.settlementId,
    createdAt: row.createdAt.toISOString(),
  }));
  const preview = buildSettlementPreview({
    staff: {
      id: person.id,
      fullName: person.fullName,
      role: person.role,
      dailyBaseRate: Number(person.dailyBaseRate),
      hourlyRate: Number(person.hourlyRate),
    },
    attendance: logs.map((log) => ({
      id: log.id,
      staffId: log.staffId,
      workDate: dateKey(log.workDate),
      isPresent: log.isPresent,
      overtimeHours: Number(log.overtimeHours),
      settlementId: log.settlementId,
    })),
    advances: advanceRows,
    settlements: last
      ? [
          {
            id: last.id,
            staffId: last.staffId,
            staffName: person.fullName,
            periodStart: dateKey(last.periodStart),
            periodEnd: dateKey(last.periodEnd),
            daysPresent: Number(last.daysPresent),
            totalOvertimeHours: Number(last.totalOvertimeHours),
            basePay: Number(last.basePay),
            overtimePay: Number(last.overtimePay),
            grossPayable: Number(last.grossPayable),
            grossEarned: Number(last.grossEarned),
            priorBalanceCarryover: Number(last.priorBalanceCarryover),
            priorAdvanceCarryover: Number(last.priorAdvanceCarryover),
            currentCycleAdvances: Number(last.currentCycleAdvances),
            totalDeductions: Number(last.totalDeductions),
            netAmountDue: Number(last.netAmountDue),
            amountPaid: Number(last.amountPaid),
            closingBalance: Number(last.closingBalance),
            newBalanceCarryover: Number(last.newBalanceCarryover),
            newAdvanceCarryover: Number(last.newAdvanceCarryover),
            checkoutType: last.checkoutType,
            status: last.status,
            basePayslipNumber: last.basePayslipNumber,
            payslipNumber: last.payslipNumber,
            version: last.version,
            notes: last.notes,
            createdAt: last.createdAt.toISOString(),
          },
        ]
      : [],
    endDate: input.endDate,
    manualAmountPaid: input.manualAmountPaid,
  });

  const empty =
    preview.daysPresent === 0 &&
    preview.totalOvertimeHours === 0 &&
    preview.priorBalanceCarryover === 0 &&
    preview.priorAdvanceCarryover === 0 &&
    preview.currentCycleAdvances === 0;
  if (empty) {
    return { ok: false as const, message: "Nothing to settle through that date." };
  }

  const settlementDate = new Date();
  const slip = await allocatePayslip(executor, settlementDate);
  const [created] = await executor
    .insert(payrollSettlements)
    .values({
      staffId: person.id,
      settlementDate,
      ...slip,
      periodStart: noonUtc(preview.periodStart),
      periodEnd: noonUtc(preview.periodEnd),
      daysPresent: money(preview.daysPresent),
      totalOvertimeHours: money(preview.totalOvertimeHours),
      basePay: money(preview.basePay),
      overtimePay: money(preview.overtimePay),
      grossPayable: money(preview.grossEarned),
      grossEarned: money(preview.grossEarned),
      priorBalanceCarryover: money(preview.priorBalanceCarryover),
      priorAdvanceCarryover: money(preview.priorAdvanceCarryover),
      currentCycleAdvances: money(preview.currentCycleAdvances),
      totalDeductions: money(preview.totalDeductions),
      netAmountDue: money(preview.netAmountDue),
      amountPaid: money(preview.amountPaid),
      closingBalance: money(preview.closingBalance),
      newBalanceCarryover: money(preview.newBalanceCarryover),
      newAdvanceCarryover: money(preview.newAdvanceCarryover),
      checkoutType: "WEEKLY_CYCLED",
      status: "PAID",
      notes: input.notes?.trim() || null,
    })
    .returning();

  if (preview.logIds.length > 0) {
    await executor
      .update(attendanceLogs)
      .set({ settlementId: created.id })
      .where(inArray(attendanceLogs.id, preview.logIds));
  }
  if (preview.advanceIds.length > 0) {
    await executor
      .update(staffAdvances)
      .set({ settlementId: created.id })
      .where(inArray(staffAdvances.id, preview.advanceIds));
  }

  const createdAt = created.createdAt instanceof Date ? created.createdAt : new Date(created.createdAt);
  const settlement: SettlementRow = {
    id: created.id,
    staffId: person.id,
    staffName: person.fullName,
    periodStart: preview.periodStart,
    periodEnd: preview.periodEnd,
    daysPresent: preview.daysPresent,
    totalOvertimeHours: preview.totalOvertimeHours,
    basePay: preview.basePay,
    overtimePay: preview.overtimePay,
    grossPayable: preview.grossEarned,
    grossEarned: preview.grossEarned,
    priorBalanceCarryover: preview.priorBalanceCarryover,
    priorAdvanceCarryover: preview.priorAdvanceCarryover,
    currentCycleAdvances: preview.currentCycleAdvances,
    totalDeductions: preview.totalDeductions,
    netAmountDue: preview.netAmountDue,
    amountPaid: preview.amountPaid,
    closingBalance: preview.closingBalance,
    newBalanceCarryover: preview.newBalanceCarryover,
    newAdvanceCarryover: preview.newAdvanceCarryover,
    checkoutType: "WEEKLY_CYCLED",
    status: "PAID",
    notes: input.notes?.trim() || null,
    basePayslipNumber: created.basePayslipNumber,
    payslipNumber: created.payslipNumber,
    version: created.version,
    createdAt: createdAt.toISOString(),
  };

  return {
    ok: true as const,
    settlement,
    settledLogIds: preview.logIds,
    settledAdvanceIds: preview.advanceIds,
  };
}
