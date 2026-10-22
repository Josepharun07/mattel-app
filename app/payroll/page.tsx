import type { Metadata } from "next";
import { getWeeklyPayrollSummary } from "@/actions/payroll-actions";
import { PayrollDesk } from "@/components/payroll/payroll-desk";
import { PageFrame } from "@/components/shell/page-frame";
import { currentWeek } from "@/lib/payroll/range";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const week = currentWeek();
  const dashboard = await getWeeklyPayrollSummary(week.start, week.end);

  return (
    <PageFrame
      eyebrow="Workforce"
      title="Attendance and payroll"
      description="Mark daily presence and overtime, then settle a mid-week checkout or the Monday–Sunday cycle. Settled days stay locked."
      width="wide"
    >
      <PayrollDesk initial={dashboard} />
    </PageFrame>
  );
}
