import type { Metadata } from "next";
import { getWeeklyPayrollSummary } from "@/actions/payroll-actions";
import { PayrollDesk } from "@/components/payroll/payroll-desk";
import { currentWeek } from "@/lib/payroll/range";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const week = currentWeek();
  const dashboard = await getWeeklyPayrollSummary(week.start, week.end);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Workforce</p>
      <h1 className="mt-1 text-2xl font-semibold">Attendance and payroll</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Mark daily presence and overtime, then settle a mid-week checkout or the Monday–Sunday cycle. Settled days stay locked.
      </p>
      <PayrollDesk initial={dashboard} />
    </div>
  );
}
