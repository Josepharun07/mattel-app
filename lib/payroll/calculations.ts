import { roundMoney } from "@/lib/money";

export type AttendanceMark = "FULL" | "HALF" | "ABSENT";

export function calculateOvertimePay(
  overtimeHours: number,
  hourlyRate: number,
): number {
  return roundMoney(overtimeHours * hourlyRate);
}

export function calculateShiftPay(
  mark: AttendanceMark,
  dailyRate: number,
  overtimeHours: number,
  hourlyRate: number,
): { basePay: number; overtimePay: number; total: number } {
  const basePay =
    mark === "FULL" ? roundMoney(dailyRate) : mark === "HALF" ? roundMoney(dailyRate / 2) : 0;
  const overtimePay = calculateOvertimePay(overtimeHours, hourlyRate);

  return {
    basePay,
    overtimePay,
    total: roundMoney(basePay + overtimePay),
  };
}

export function calculateWeeklyPay(
  shifts: {
    mark: AttendanceMark;
    dailyRate: number;
    overtimeHours: number;
    hourlyRate: number;
  }[],
): { basePay: number; overtimePay: number; total: number } {
  return shifts.reduce(
    (sum, shift) => {
      const pay = calculateShiftPay(
        shift.mark,
        shift.dailyRate,
        shift.overtimeHours,
        shift.hourlyRate,
      );
      return {
        basePay: roundMoney(sum.basePay + pay.basePay),
        overtimePay: roundMoney(sum.overtimePay + pay.overtimePay),
        total: roundMoney(sum.total + pay.total),
      };
    },
    { basePay: 0, overtimePay: 0, total: 0 },
  );
}
