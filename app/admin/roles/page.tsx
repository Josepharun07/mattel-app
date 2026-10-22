import type { Metadata } from "next";
import { RolesDesk } from "@/components/admin/roles-desk";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return <RolesDesk />;
}
