import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { gate } from "@/lib/auth/gate";
import { getRole } from "@/controllers/roles";
import { RoleAccess } from "@/views/roles/role-access";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const role = await getRole(id);
  return { title: role?.name ?? "Role" };
}

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("roles.manage");
  if (denied) return denied;
  const { id } = await params;
  const role = await getRole(id);
  if (!role) notFound();
  return <RoleAccess role={role} />;
}
