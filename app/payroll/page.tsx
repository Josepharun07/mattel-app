import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getWeeklyPayrollSummary } from "@/controllers/payroll";
import { PayrollDesk } from "@/views/payroll/payroll-desk";
import { PageFrame } from "@/views/shell/page-frame";
import { currentWeek } from "@/lib/payroll/range";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const denied = await gate("payroll.read");
  if (denied) return denied;

  const week = currentWeek();
  const dashboard = await getWeeklyPayrollSummary(week.start, week.end);

  return (
    <PageFrame
      eyebrow="Workforce"
      title="Payroll"
      description="Settle one person at a time for the Sunday–Saturday week. Sunday is the usual off day unless attendance shows they worked."
      width="wide"
    >
      <PayrollDesk initial={dashboard} focus="payroll" />
    </PageFrame>
  );
}
