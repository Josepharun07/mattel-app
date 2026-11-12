import type { Metadata } from "next";
import { gate } from "@/lib/auth/gate";
import { getRoles } from "@/controllers/roles";
import { RolesDesk } from "@/views/roles/roles-desk";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const denied = await gate("roles.manage");
  if (denied) return denied;
  return <RolesDesk roles={await getRoles()} />;
}
