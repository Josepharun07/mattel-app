import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getStaffDirectory } from "@/controllers/staff";
import { StaffEditor } from "@/views/staff/staff-editor";
import { getCurrentSession } from "@/lib/auth/current";

export const metadata: Metadata = { title: "New employee" };

export default async function NewStaffPage() {
  const denied = await gate("staff.write");
  if (denied) return denied;

  const session = await getCurrentSession();
  return <StaffEditor directory={await getStaffDirectory()} role={session?.role ?? "OPERATOR"} canEdit />;
}
