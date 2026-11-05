import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/auth/current";
import { allows } from "@/lib/auth/rbac";
import { getStaffDirectory } from "@/controllers/staff";
import { StaffDirectoryGrid } from "@/views/staff/staff-directory";

export const metadata: Metadata = { title: "Employees" };

export default async function StaffPage() {
  const denied = await gate("staff.read");
  if (denied) return denied;

  const session = await getCurrentSession();
  return <StaffDirectoryGrid directory={await getStaffDirectory()} canAdd={Boolean(session && allows(session, "staff.write"))} />;
}
