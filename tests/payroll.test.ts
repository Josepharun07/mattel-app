import { describe, expect, it } from "vitest";
import { calculateRangePayroll, filterUnsettledAttendance, unsettledHoursWorked } from "@/lib/engines/payroll-engine";
import { buildSamplePayroll } from "@/lib/payroll/sample";
import { projectCheckout } from "@/lib/payroll/settle";
import { summarizePayroll } from "@/lib/payroll/summarize";

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

  it("builds the sample week and locks a mid-week checkout", () => {
    const dash = buildSamplePayroll("2026-10-05", "2026-10-11", new Date(2026, 9, 7));
    const summary = summarizePayroll(
      dash.staff,
      dash.attendance,
      dash.settlements,
      dash.periodStart,
      dash.periodEnd,
      "2026-10",
    );
    expect(summary.activeStaff).toBe(2);
    expect(summary.pendingPayroll).toBe(4610);
    expect(summary.settledThisMonth).toBe(1100);
    expect(summary.unsettledHours).toBe(38);

    const suresh = dash.staff[1];
    const projected = projectCheckout({
      staff: suresh,
      attendance: dash.attendance,
      startDate: "2026-10-05",
      endDate: "2026-10-07",
      checkoutType: "MID_WEEK_CHECKOUT",
      notes: "Wednesday checkout",
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }
    expect(projected.settlement.grossPayable).toBe(1550);
    expect(projected.settlement.daysPresent).toBe(1);
    expect(projected.settlement.checkoutType).toBe("MID_WEEK_CHECKOUT");
    expect(projected.attendance.find((row) => row.id === "att-suresh-mon")?.settlementId).toBe("settle-suresh-monday");
    expect(projected.settledLogIds).toContain("att-suresh-tue");
    expect(projected.settledLogIds).toContain("att-suresh-wed");
    expect(projected.settledLogIds).not.toContain("att-suresh-mon");
  });
});
