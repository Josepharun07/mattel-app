"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/views/ui/button";

export function PickProject({ projects }: { projects: { id: string; name: string; publicCode: string }[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  return (
    <form
      className="max-w-lg space-y-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (projectId) router.push(`/invoices/new/${projectId}`);
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>Project</span>
        <select
          aria-label="Project"
          className="h-9 w-full rounded-md border bg-white px-3"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name} · {project.publicCode}</option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={!projectId}>Next</Button>
    </form>
  );
}
