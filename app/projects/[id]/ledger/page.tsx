import type { Metadata } from "next";
import { getProjectLedger, getProjectLedgerStats, getUnbilledProjectEntries } from "@/actions/ledger-actions";
import { ProjectEventTerminal } from "@/components/projects/project-event-terminal";

export const metadata: Metadata = { title: "Project ledger" };

export default async function ProjectLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ledger, stats, unbilled] = await Promise.all([
    getProjectLedger(id),
    getProjectLedgerStats(id),
    getUnbilledProjectEntries(id),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Project ledger</p>
      <h1 className="mt-1 text-2xl font-semibold">{stats.projectName}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        {stats.clientName}. Unbilled site events stay open until the selected rows are compiled into a construction invoice.
      </p>
      <ProjectEventTerminal initial={ledger} openOnServer={unbilled.length} />
    </div>
  );
}
