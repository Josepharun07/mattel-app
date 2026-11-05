import type { Metadata } from "next";
import { gate } from "@/lib/auth/gate";
import { listProjects } from "@/models/projects";
import { ProjectsDesk } from "@/views/projects/projects-desk";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const denied = await gate("projects.read");
  if (denied) return denied;
  const board = await listProjects();
  return <ProjectsDesk clients={board.clients} projects={board.projects} />;
}
