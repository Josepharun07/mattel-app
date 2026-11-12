import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getWeeklyPayrollSummary } from "@/controllers/payroll";
import { PayrollDesk } from "@/views/payroll/payroll-desk";
import { PageFrame } from "@/views/shell/page-frame";
import { currentWeek } from "@/lib/payroll/range";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const denied = await gate("attendance.read");
  if (denied) return denied;

  const week = currentWeek();
  const dashboard = await getWeeklyPayrollSummary(week.start, week.end);

  return (
    <PageFrame
      eyebrow="Workforce"
      title="Attendance"
      description="The week runs Sunday to Saturday. Sunday is off unless someone worked. Mark each day absent, half day, or full day, and add overtime."
      width="wide"
    >
      <PayrollDesk initial={dashboard} focus="attendance" />
    </PageFrame>
  );
}
