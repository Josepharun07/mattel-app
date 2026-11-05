import { gate } from "@/lib/auth/gate";
import { getCurrentSession } from "@/lib/auth/current";
import { findClient } from "@/models/clients";
import { ClientProfile } from "@/views/clients/client-profile";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("clients.read");
  if (denied) return denied;
  const { id } = await params;
  const [record, session] = await Promise.all([findClient(id), getCurrentSession()]);
  const admin = session?.role === "OWNER" || session?.role === "SUPER_ADMIN";
  return <ClientProfile client={record.client} projects={record.projects} assignedIds={record.assignedIds} admin={admin} />;
}
