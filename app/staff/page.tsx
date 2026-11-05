import type { Metadata } from "next";
import { getStaffDirectory } from "@/actions/staff-actions";
import { StaffDesk } from "@/components/staff/staff-desk";
import { getCurrentSession } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await getCurrentSession();
  return <StaffDesk directory={await getStaffDirectory()} role={session?.role ?? "OPERATOR"} />;
}
