import { calculateRangePayroll, calculateStaffPayroll, closeSettlement, filterUnsettledThrough, issuePayslipNumber } from "@/lib/engines/payroll-engine";
import { roundMoney } from "@/lib/money";
import type { AdvanceRow, AttendanceCell, CheckoutType, SettlementRow, StaffMember } from "@/lib/payroll/types";

export function projectCheckout(input: {
  staff: StaffMember;
  attendance: AttendanceCell[];
  startDate: string;
  endDate: string;
  checkoutType: CheckoutType;
  notes?: string;
  settlementId?: string;
  takenPayslips?: string[];
}):
  | { ok: true; settlement: SettlementRow; attendance: AttendanceCell[]; settledLogIds: string[] }
  | { ok: false; message: string } {
  if (input.startDate > input.endDate) {
    return { ok: false, message: "The start date must be on or before the end date." };
  }

  const included = input.attendance.filter(
    (row) =>
      row.staffId === input.staff.id &&
      !row.settlementId &&
      row.workDate >= input.startDate &&
      row.workDate <= input.endDate,
  );
  const payroll = calculateRangePayroll(
    input.staff.dailyBaseRate,
    input.staff.hourlyRate,
    included,
    input.startDate,
    input.endDate,
  );

  if (payroll.daysPresent === 0 && payroll.totalOvertimeHours === 0) {
    return { ok: false, message: "No payable attendance in that range." };
  }

  const settlementId = input.settlementId ?? crypto.randomUUID();
  const settledLogIds = included.map((row) => row.id);
  const idSet = new Set(settledLogIds);
  const settlement: SettlementRow = {
    id: settlementId,
    staffId: input.staff.id,
    staffName: input.staff.fullName,
    periodStart: input.startDate,
    periodEnd: input.endDate,
    daysPresent: payroll.daysPresent,
    totalOvertimeHours: payroll.totalOvertimeHours,
    basePay: payroll.basePay,
    overtimePay: payroll.overtimePay,
    grossPayable: payroll.grossPayable,
    ...closeSettlement({
      grossEarned: payroll.grossPayable,
      priorBalanceCarryover: 0,
      priorAdvanceCarryover: 0,
      currentCycleAdvances: 0,
    }),
    checkoutType: input.checkoutType,
    status: "PAID",
    notes: input.notes?.trim() || null,
    ...issuePayslipNumber(input.takenPayslips ?? [], input.endDate),
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    settlement,
    settledLogIds,
    attendance: input.attendance.map((row) => (idSet.has(row.id) ? { ...row, settlementId } : row)),
  };
}

export function buildSettlementPreview(input: {
  staff: StaffMember;
  attendance: AttendanceCell[];
  advances: AdvanceRow[];
  settlements: SettlementRow[];
  endDate: string;
  manualAmountPaid?: number;
}) {
  const logs = filterUnsettledThrough(
    input.attendance.filter((row) => row.staffId === input.staff.id),
    input.endDate,
  );
  const earned = calculateStaffPayroll(input.staff.dailyBaseRate, input.staff.hourlyRate, logs);
  const openAdvances = input.advances.filter(
    (row) => row.staffId === input.staff.id && !row.settlementId && row.requestDate <= input.endDate,
  );
  const last = input.settlements
    .filter((row) => row.staffId === input.staff.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const closing = closeSettlement({
    grossEarned: earned.totalPay,
    priorBalanceCarryover: last?.newBalanceCarryover ?? 0,
    priorAdvanceCarryover: last?.newAdvanceCarryover ?? 0,
    currentCycleAdvances: roundMoney(openAdvances.reduce((sum, row) => sum + row.amount, 0)),
    manualAmountPaid: input.manualAmountPaid,
  });
  const dates = logs.map((row) => row.workDate).sort();

  return {
    ...closing,
    daysPresent: earned.daysPresent,
    totalOvertimeHours: earned.totalOvertimeHours,
    basePay: earned.basePay,
    overtimePay: earned.overtimePay,
    periodStart: dates[0] ?? input.endDate,
    periodEnd: input.endDate,
    logIds: logs.map((row) => row.id),
    advanceIds: openAdvances.map((row) => row.id),
  };
}

export function projectAccountSettlement(input: {
  staff: StaffMember;
  attendance: AttendanceCell[];
  advances: AdvanceRow[];
  settlements: SettlementRow[];
  endDate: string;
  manualAmountPaid: number;
  notes?: string;
  settlementId?: string;
}) {
  const preview = buildSettlementPreview(input);
  const empty =
    preview.daysPresent === 0 &&
    preview.totalOvertimeHours === 0 &&
    preview.priorBalanceCarryover === 0 &&
    preview.priorAdvanceCarryover === 0 &&
    preview.currentCycleAdvances === 0;
  if (empty) {
    return { ok: false as const, message: "Nothing to settle through that date." };
  }

  const settlementId = input.settlementId ?? crypto.randomUUID();
  const logIds = new Set(preview.logIds);
  const advanceIds = new Set(preview.advanceIds);
  const settlement: SettlementRow = {
    id: settlementId,
    staffId: input.staff.id,
    staffName: input.staff.fullName,
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
    ...issuePayslipNumber(
      input.settlements.map((row) => row.basePayslipNumber).filter(Boolean),
      input.endDate,
    ),
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true as const,
    settlement,
    settledLogIds: preview.logIds,
    settledAdvanceIds: preview.advanceIds,
    attendance: input.attendance.map((row) => (logIds.has(row.id) ? { ...row, settlementId } : row)),
    advances: input.advances.map((row) => (advanceIds.has(row.id) ? { ...row, settlementId } : row)),
  };
}
