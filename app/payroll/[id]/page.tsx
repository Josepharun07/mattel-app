import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmployeePayroll } from "@/controllers/payroll";
import { EmployeePayouts } from "@/views/payroll/employee-payouts";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Employee payroll" };

export default async function EmployeePayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("payroll.read");
  if (denied) return denied;
  const { id } = await params;
  const record = await getEmployeePayroll(id);
  if (!record) notFound();

  return (
    <PageFrame
      eyebrow="Workforce"
      title={record.person.fullName}
      description={`${record.person.role}. Every payout and payslip for this employee, with the date it was settled.`}
      width="wide"
    >
      <EmployeePayouts person={record.person} payouts={record.payouts} />
    </PageFrame>
  );
}
