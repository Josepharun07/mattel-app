import { roundMoney } from "@/lib/money";

export interface AttendanceRecord {
  isPresent: boolean;
  overtimeHours: number;
}

export interface PayrollResult {
  daysPresent: number;
  totalOvertimeHours: number;
  basePay: number;
  overtimePay: number;
  totalPay: number;
}

export function calculateStaffPayroll(
  dailyBaseRate: number,
  hourlyRate: number,
  records: AttendanceRecord[],
): PayrollResult {
  let daysPresent = 0;
  let totalOvertimeHours = 0;

  for (const record of records) {
    if (record.isPresent) {
      daysPresent += 1;
      totalOvertimeHours += record.overtimeHours || 0;
    }
  }

  const basePay = roundMoney(daysPresent * dailyBaseRate);
  const overtimePay = roundMoney(totalOvertimeHours * hourlyRate);
  const totalPay = roundMoney(basePay + overtimePay);

  return {
    daysPresent,
    totalOvertimeHours: roundMoney(totalOvertimeHours),
    basePay,
    overtimePay,
    totalPay,
  };
}

export interface AttendanceLogRecord extends AttendanceRecord {
  workDate: string;
  settlementId?: string | null;
}

export interface RangePayrollResult extends PayrollResult {
  grossPayable: number;
}

export const STANDARD_SHIFT_HOURS = 8;

export function filterUnsettledAttendance<T extends AttendanceLogRecord>(
  records: T[],
  startDate: string,
  endDate: string,
): T[] {
  return records.filter((record) => {
    if (record.settlementId) {
      return false;
    }
    return record.workDate >= startDate && record.workDate <= endDate;
  });
}

export function calculateRangePayroll(
  dailyBaseRate: number,
  hourlyRate: number,
  records: AttendanceLogRecord[],
  startDate: string,
  endDate: string,
): RangePayrollResult {
  const unsettled = filterUnsettledAttendance(records, startDate, endDate);
  const payroll = calculateStaffPayroll(dailyBaseRate, hourlyRate, unsettled);
  return { ...payroll, grossPayable: payroll.totalPay };
}

export function filterUnsettledThrough<T extends AttendanceLogRecord>(records: T[], endDate: string): T[] {
  return records.filter((record) => !record.settlementId && record.workDate <= endDate);
}

export interface SettlementClosingInput {
  grossEarned: number;
  priorBalanceCarryover: number;
  priorAdvanceCarryover: number;
  currentCycleAdvances: number;
  manualAmountPaid?: number;
}

export interface SettlementClosing {
  grossEarned: number;
  priorBalanceCarryover: number;
  priorAdvanceCarryover: number;
  currentCycleAdvances: number;
  totalDeductions: number;
  netAmountDue: number;
  amountPaid: number;
  closingBalance: number;
  newBalanceCarryover: number;
  newAdvanceCarryover: number;
}

export function closeSettlement(input: SettlementClosingInput): SettlementClosing {
  const grossEarned = roundMoney(input.grossEarned);
  const priorBalanceCarryover = roundMoney(input.priorBalanceCarryover);
  const priorAdvanceCarryover = roundMoney(input.priorAdvanceCarryover);
  const currentCycleAdvances = roundMoney(input.currentCycleAdvances);
  const totalDeductions = roundMoney(priorAdvanceCarryover + currentCycleAdvances);
  const netAmountDue = roundMoney(grossEarned + priorBalanceCarryover - totalDeductions);
  const amountPaid = roundMoney(input.manualAmountPaid ?? netAmountDue);
  const closingBalance = roundMoney(amountPaid - netAmountDue);
  const newBalanceCarryover = closingBalance < 0 ? roundMoney(Math.abs(closingBalance)) : 0;
  const newAdvanceCarryover = closingBalance > 0 ? closingBalance : 0;

  return {
    grossEarned,
    priorBalanceCarryover,
    priorAdvanceCarryover,
    currentCycleAdvances,
    totalDeductions,
    netAmountDue,
    amountPaid,
    closingBalance,
    newBalanceCarryover,
    newAdvanceCarryover,
  };
}

export function generatePayslipNumber(year: number, sequence: number) {
  const serial = String(Math.max(0, Math.trunc(sequence))).padStart(4, "0");
  return `MI/PAY/${year}/${serial}`;
}

export function applyPayslipVersionSuffix(baseNumber: string, version: number) {
  if (version <= 0) {
    return baseNumber;
  }
  return `${baseNumber}-v${version}`;
}

export function issuePayslipNumber(takenBaseNumbers: string[], settlementDate: Date | string) {
  const year = typeof settlementDate === "string" ? Number(settlementDate.slice(0, 4)) : settlementDate.getFullYear();
  const safeYear = Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
  const prefix = `MI/PAY/${safeYear}/`;
  const maxSequence = takenBaseNumbers.reduce((max, value) => {
    if (!value?.startsWith(prefix)) {
      return max;
    }
    const sequence = Number(value.slice(prefix.length).split("-v")[0]);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  const basePayslipNumber = generatePayslipNumber(safeYear, maxSequence + 1);
  return { basePayslipNumber, payslipNumber: basePayslipNumber, version: 0 };
}

export function recalculateSettlement(input: {
  dailyBaseRate: number;
  hourlyRate: number;
  daysPresent: number;
  totalOvertimeHours: number;
  priorBalanceCarryover: number;
  priorAdvanceCarryover: number;
  currentCycleAdvances: number;
  amountPaid: number;
}) {
  const basePay = roundMoney(input.daysPresent * input.dailyBaseRate);
  const overtimePay = roundMoney(input.totalOvertimeHours * input.hourlyRate);
  const grossEarned = roundMoney(basePay + overtimePay);
  return {
    daysPresent: input.daysPresent,
    totalOvertimeHours: roundMoney(input.totalOvertimeHours),
    basePay,
    overtimePay,
    grossPayable: grossEarned,
    ...closeSettlement({
      grossEarned,
      priorBalanceCarryover: input.priorBalanceCarryover,
      priorAdvanceCarryover: input.priorAdvanceCarryover,
      currentCycleAdvances: input.currentCycleAdvances,
      manualAmountPaid: input.amountPaid,
    }),
  };
}

export function unsettledHoursWorked(
  records: AttendanceLogRecord[],
  startDate: string,
  endDate: string,
): number {
  let hours = 0;
  for (const record of records) {
    if (record.settlementId || !record.isPresent) {
      continue;
    }
    if (record.workDate < startDate || record.workDate > endDate) {
      continue;
    }
    hours += STANDARD_SHIFT_HOURS + (record.overtimeHours || 0);
  }
  return roundMoney(hours);
}
