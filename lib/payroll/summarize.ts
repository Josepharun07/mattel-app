import { calculateRangePayroll, unsettledHoursWorked } from "@/lib/engines/payroll-engine";
import { roundMoney } from "@/lib/money";
import type { AttendanceCell, PayrollSummaryRow, SettlementRow, StaffMember } from "@/lib/payroll/types";

export function summarizePayroll(
  staff: StaffMember[],
  attendance: AttendanceCell[],
  settlements: SettlementRow[],
  startDate: string,
  endDate: string,
  monthKey: string,
) {
  const rows: PayrollSummaryRow[] = staff.map((person) => {
    const logs = attendance.filter((row) => row.staffId === person.id);
    const pay = calculateRangePayroll(person.dailyBaseRate, person.hourlyRate, logs, startDate, endDate);
    return {
      staffId: person.id,
      fullName: person.fullName,
      role: person.role,
      dailyBaseRate: person.dailyBaseRate,
      hourlyRate: person.hourlyRate,
      daysPresent: pay.daysPresent,
      totalOvertimeHours: pay.totalOvertimeHours,
      basePay: pay.basePay,
      overtimePay: pay.overtimePay,
      grossPayable: pay.grossPayable,
    };
  });

  return {
    rows,
    activeStaff: staff.length,
    pendingPayroll: roundMoney(rows.reduce((sum, row) => sum + row.grossPayable, 0)),
    unsettledHours: unsettledHoursWorked(attendance, startDate, endDate),
    settledThisMonth: roundMoney(
      settlements
        .filter((row) => row.status === "PAID" && row.createdAt.slice(0, 7) === monthKey)
        .reduce((sum, row) => sum + row.grossPayable, 0),
    ),
  };
}
