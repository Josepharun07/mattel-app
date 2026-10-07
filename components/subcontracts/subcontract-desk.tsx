"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Briefcase, DollarSign, PlusCircle, Users } from "lucide-react";
import { CreateSubcontractModal } from "@/components/subcontracts/create-subcontract-modal";
import { IssueDrawModal } from "@/components/subcontracts/issue-draw-modal";
import { SubcontractTable } from "@/components/subcontracts/subcontract-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  payoutProgress,
  remainingContractBalance,
  statusAfterDraw,
  totalAdvancesDrawn,
} from "@/lib/engines/subcontract-engine";
import { formatInr } from "@/lib/money";
import { readSubcontractSession, serverSubcontractSession, subscribeSubcontractSession, writeSubcontractSession } from "@/lib/subcontracts/session";
import type { SubcontractDirectory, SubcontractDraw, SubcontractRecord } from "@/lib/subcontracts/types";

function withTotals(contract: SubcontractRecord): SubcontractRecord {
  const totalAdvances = totalAdvancesDrawn(contract.draws);
  const remainingBalance = remainingContractBalance(contract.totalContractAmount, totalAdvances);
  return {
    ...contract,
    totalAdvances,
    remainingBalance,
    progress: payoutProgress(contract.totalContractAmount, totalAdvances),
    status: statusAfterDraw(contract.status === "TERMINATED" ? "TERMINATED" : "ACTIVE", remainingBalance),
  };
}

export function SubcontractDesk({ initial }: { initial: SubcontractDirectory }) {
  const session = useSyncExternalStore(subscribeSubcontractSession, readSubcontractSession, serverSubcontractSession);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState<SubcontractRecord | null>(null);
  const [notice, setNotice] = useState("");

  const map = new Map(initial.contracts.map((row) => [row.id, row]));
  for (const contract of session.contracts) {
    map.set(contract.id, contract);
  }
  const contracts = [...map.values()].map(withTotals);
  const filtered = contracts.filter((contract) => {
    const haystack = `${contract.title} ${contract.leadName} ${contract.leadPhone ?? ""} ${contract.projectName}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesProject = projectId === "ALL" || contract.projectId === projectId;
    return matchesQuery && matchesProject;
  });
  const active = contracts.filter((contract) => contract.status === "ACTIVE");
  const contracted = contracts.reduce((sum, contract) => sum + contract.totalContractAmount, 0);
  const advances = contracts.reduce((sum, contract) => sum + contract.totalAdvances, 0);
  const remaining = contracts.reduce((sum, contract) => sum + contract.remainingBalance, 0);

  function persist(next: SubcontractRecord) {
    const current = readSubcontractSession();
    writeSubcontractSession({
      ...current,
      contracts: [...current.contracts.filter((row) => row.id !== next.id), next],
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Briefcase className="size-4" />} label="Active contracts" value={String(active.length)} />
        <Card icon={<DollarSign className="size-4" />} label="Contracted value" value={formatInr(contracted)} />
        <Card icon={<Users className="size-4" />} label="Advances disbursed" value={formatInr(advances)} />
        <Card icon={<DollarSign className="size-4" />} label="Remaining payable" value={formatInr(remaining)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search title, lead, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="h-9 rounded-md border px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="ALL">All projects</option>
          {initial.projects.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <Button type="button" onClick={() => setCreating(true)}>
          <PlusCircle />
          New subcontract
        </Button>
      </div>
      <SubcontractTable contracts={filtered} onDraw={setDrawing} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {creating ? (
        <CreateSubcontractModal
          staff={initial.staff}
          projects={initial.projects}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            const row = withTotals({
              id: crypto.randomUUID(),
              projectId: created.projectId,
              projectName: initial.projects.find((site) => site.id === created.projectId)?.name ?? "Project",
              title: created.title,
              leadPersonType: created.leadPersonType,
              leadStaffId: created.leadStaffId ?? null,
              leadName: created.leadName,
              leadPhone: created.leadPhone ?? null,
              teamMembers: created.teamMembers,
              totalContractAmount: created.totalContractAmount,
              status: "ACTIVE",
              draws: [],
              totalAdvances: 0,
              remainingBalance: created.totalContractAmount,
              progress: 0,
              createdAt: new Date().toISOString(),
            });
            persist(row);
            setNotice(`${row.title} created.`);
            setCreating(false);
          }}
        />
      ) : null}
      {drawing ? (
        <IssueDrawModal
          contract={drawing}
          onClose={() => setDrawing(null)}
          onIssued={(issued) => {
            const draw: SubcontractDraw = {
              id: crypto.randomUUID(),
              subcontractId: drawing.id,
              drawDate: new Date().toISOString().slice(0, 10),
              amountPaid: issued.amountPaid,
              paymentMode: issued.paymentMode,
              referenceNumber: issued.referenceNumber || null,
              notes: issued.notes || null,
            };
            const next = withTotals({ ...drawing, draws: [...drawing.draws, draw] });
            persist(next);
            setNotice(`${formatInr(issued.amountPaid)} advanced on ${drawing.title}. Remaining ${formatInr(next.remainingBalance)}.`);
            setDrawing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Card({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
