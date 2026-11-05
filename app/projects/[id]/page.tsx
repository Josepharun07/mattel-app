import { gate } from "@/lib/auth/gate";
import { getCurrentSession } from "@/lib/auth/current";
import { findProject, listEntryMaterials } from "@/models/projects";
import { ProjectProfile } from "@/views/projects/project-profile";

export const dynamic = "force-dynamic";

export default async function ProjectProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("projects.read");
  if (denied) return denied;
  const { id } = await params;
  const [record, session, materials] = await Promise.all([findProject(id), getCurrentSession(), listEntryMaterials()]);
  const admin = session?.role === "OWNER" || session?.role === "SUPER_ADMIN";
  return <ProjectProfile project={record.project} clients={record.clients} entries={record.entries} invoices={record.invoices} materials={materials} admin={admin} />;
}
