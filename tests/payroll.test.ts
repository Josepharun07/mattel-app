import { describe, expect, it } from "vitest";
import { calculateRangePayroll, filterUnsettledAttendance, unsettledHoursWorked } from "@/lib/engines/payroll-engine";

describe("payroll range engine", () => {
  const logs = [
    { workDate: "2026-10-05", isPresent: true, overtimeHours: 2, settlementId: null },
    { workDate: "2026-10-06", isPresent: true, overtimeHours: 1, settlementId: "paid" },
    { workDate: "2026-10-07", isPresent: false, overtimeHours: 4, settlementId: null },
    { workDate: "2026-10-12", isPresent: true, overtimeHours: 3, settlementId: null },
  ];

  it("pays only unsettled present days inside the range", () => {
    expect(filterUnsettledAttendance(logs, "2026-10-05", "2026-10-07")).toHaveLength(2);
    expect(unsettledHoursWorked(logs, "2026-10-05", "2026-10-07")).toBe(10);
    expect(calculateRangePayroll(900, 120, logs, "2026-10-05", "2026-10-07")).toEqual({
      daysPresent: 1,
      totalOvertimeHours: 2,
      basePay: 900,
      overtimePay: 240,
      totalPay: 1140,
      grossPayable: 1140,
    });
  });
});
