import type { Metadata } from "next";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { ProjectsDesk } from "@/components/projects/projects-desk";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  if (!process.env.DATABASE_URL) {
    return <ProjectsDesk clients={[]} projects={[]} />;
  }

  const [clientRows, projectRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(isNull(clients.deletedAt)).orderBy(clients.name),
    db
      .select({
        id: projects.id,
        name: projects.name,
        location: projects.location,
        status: projects.status,
        clientName: clients.name,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(and(isNull(projects.deletedAt), isNull(clients.deletedAt)))
      .orderBy(desc(projects.createdAt)),
  ]);

  return (
    <ProjectsDesk
      clients={clientRows}
      projects={projectRows.map((project) => ({ ...project, location: project.location ?? "" }))}
    />
  );
}
