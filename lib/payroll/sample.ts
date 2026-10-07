import { addDays, format, parseISO } from "date-fns";
import { closeSettlement } from "@/lib/engines/payroll-engine";
import { currentWeek, listDates } from "@/lib/payroll/range";
import type { AdvanceRow, AttendanceCell, PayrollDashboard, SettlementRow, StaffMember } from "@/lib/payroll/types";

export function buildSamplePayroll(startDate: string, endDate: string, today = new Date()): PayrollDashboard {
  const week = currentWeek(today);
  const days = listDates(week.start, week.end);
  const monday = days[0] ?? week.start;
  const tuesday = days[1] ?? week.start;
  const wednesday = days[2] ?? week.start;
  const staff: StaffMember[] = [
    {
      id: "staff-rajesh",
      fullName: "Rajesh Kumar",
      role: "Site Supervisor",
      dailyBaseRate: 900,
      hourlyRate: 120,
    },
    {
      id: "staff-suresh",
      fullName: "Suresh P.",
      role: "Heavy Machinery Operator",
      dailyBaseRate: 1100,
      hourlyRate: 150,
    },
  ];
  const settlement: SettlementRow = {
    id: "settle-suresh-monday",
    staffId: "staff-suresh",
    staffName: "Suresh P.",
    periodStart: monday,
    periodEnd: monday,
    daysPresent: 1,
    totalOvertimeHours: 0,
    basePay: 1100,
    overtimePay: 0,
    grossPayable: 1100,
    ...closeSettlement({
      grossEarned: 1100,
      priorBalanceCarryover: 0,
      priorAdvanceCarryover: 0,
      currentCycleAdvances: 0,
    }),
    checkoutType: "MID_WEEK_CHECKOUT",
    status: "PAID",
    notes: "Monday site advance",
    basePayslipNumber: "MI/PAY/2026/0002",
    payslipNumber: "MI/PAY/2026/0002",
    version: 0,
    createdAt: new Date(`${monday}T12:00:00.000Z`).toISOString(),
  };
  const earlier = format(addDays(parseISO(monday), -7), "yyyy-MM-dd");
  const priorClosing = closeSettlement({
    grossEarned: 900,
    priorBalanceCarryover: 0,
    priorAdvanceCarryover: 0,
    currentCycleAdvances: 0,
    manualAmountPaid: 500,
  });
  const priorSettlement: SettlementRow = {
    id: "settle-rajesh-prior",
    staffId: "staff-rajesh",
    staffName: "Rajesh Kumar",
    periodStart: earlier,
    periodEnd: earlier,
    daysPresent: 1,
    totalOvertimeHours: 0,
    basePay: 900,
    overtimePay: 0,
    grossPayable: 900,
    ...priorClosing,
    checkoutType: "WEEKLY_CYCLED",
    status: "PAID",
    notes: "Partial week left ₹400 unpaid",
    basePayslipNumber: "MI/PAY/2026/0001",
    payslipNumber: "MI/PAY/2026/0001",
    version: 0,
    createdAt: new Date(`${earlier}T12:00:00.000Z`).toISOString(),
  };
  const attendance: AttendanceCell[] = [
    { id: "att-rajesh-mon", staffId: "staff-rajesh", workDate: monday, isPresent: true, overtimeHours: 2, settlementId: null },
    { id: "att-rajesh-tue", staffId: "staff-rajesh", workDate: tuesday, isPresent: true, overtimeHours: 0, settlementId: null },
    { id: "att-rajesh-wed", staffId: "staff-rajesh", workDate: wednesday, isPresent: true, overtimeHours: 1, settlementId: null },
    { id: "att-suresh-mon", staffId: "staff-suresh", workDate: monday, isPresent: true, overtimeHours: 0, settlementId: settlement.id },
    { id: "att-suresh-tue", staffId: "staff-suresh", workDate: tuesday, isPresent: true, overtimeHours: 3, settlementId: null },
    { id: "att-suresh-wed", staffId: "staff-suresh", workDate: wednesday, isPresent: false, overtimeHours: 0, settlementId: null },
  ].filter((row) => row.workDate >= startDate && row.workDate <= endDate);
  const earlierUnsettled: AttendanceCell[] = [
    {
      id: "att-rajesh-prior-week",
      staffId: "staff-rajesh",
      workDate: earlier,
      isPresent: true,
      overtimeHours: 0,
      settlementId: null,
    },
  ].filter((row) => row.workDate < startDate && row.workDate <= endDate);
  const advances: AdvanceRow[] = [
    {
      id: "adv-rajesh-cash",
      staffId: "staff-rajesh",
      staffName: "Rajesh Kumar",
      requestDate: wednesday,
      amount: 500,
      paymentMode: "CASH" as const,
      notes: "Site cash",
      settlementId: null,
      createdAt: new Date(`${wednesday}T12:00:00.000Z`).toISOString(),
    },
  ].filter((row) => row.requestDate <= endDate);

  return {
    periodStart: startDate,
    periodEnd: endDate,
    staff,
    attendance,
    earlierUnsettled,
    settlements: [priorSettlement, settlement],
    advances,
    offline: true,
  };
}
