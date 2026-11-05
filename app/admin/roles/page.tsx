import type { Metadata } from "next";
import { getStaffDirectory } from "@/actions/staff-actions";
import { RolesDesk } from "@/components/admin/roles-desk";
import { getCurrentSession } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await getCurrentSession();
  return <RolesDesk directory={await getStaffDirectory()} role={session?.role ?? "OPERATOR"} />;
}
