import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients, projectClients, projects } from "@/db/schema";

export async function listClients() {
  if (!process.env.DATABASE_URL) {
    return [];
  }
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
      phone: clients.phone,
      email: clients.email,
      address: clients.address,
      gstin: clients.gstin,
      active: clients.active,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(asc(clients.name));
  return rows.map((client) => ({
    id: client.id,
    name: client.name,
    companyName: client.companyName ?? "",
    phone: client.phone,
    email: client.email ?? "",
    address: client.address ?? "",
    gstin: client.gstin ?? "",
    active: client.active,
  }));
}

export async function findClient(id: string) {
  if (!process.env.DATABASE_URL) {
    return { client: null, projects: [], assignedIds: [] as string[] };
  }
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client || client.deletedAt) {
    return { client: null, projects: [], assignedIds: [] as string[] };
  }
  const [projectRows, links] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, title: projects.title, status: projects.status })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(asc(projects.name)),
    db.select({ projectId: projectClients.projectId }).from(projectClients).where(eq(projectClients.clientId, id)),
  ]);
  return {
    client: {
      id: client.id,
      name: client.name,
      companyName: client.companyName ?? "",
      phone: client.phone,
      email: client.email ?? "",
      address: client.address ?? "",
      gstin: client.gstin ?? "",
      active: client.active,
    },
    projects: projectRows.map((project) => ({ id: project.id, name: project.name || project.title, status: project.status })),
    assignedIds: links.map((link) => link.projectId),
  };
}
