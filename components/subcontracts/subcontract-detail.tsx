"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowDownCircle, CheckCircle2, Users } from "lucide-react";
import { IssueDrawModal } from "@/components/subcontracts/issue-draw-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  payoutProgress,
  remainingContractBalance,
  statusAfterDraw,
  totalAdvancesDrawn,
} from "@/lib/engines/subcontract-engine";
import { formatInr } from "@/lib/money";
import { readSubcontractSession, serverSubcontractSession, subscribeSubcontractSession, writeSubcontractSession } from "@/lib/subcontracts/session";
import type { SubcontractDraw, SubcontractRecord } from "@/lib/subcontracts/types";

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

export function SubcontractDetail({
  contractId,
  initial,
}: {
  contractId: string;
  initial: SubcontractRecord | null;
}) {
  const session = useSyncExternalStore(subscribeSubcontractSession, readSubcontractSession, serverSubcontractSession);
  const [drawing, setDrawing] = useState(false);
  const [notice, setNotice] = useState("");
  const stored = session.contracts.find((row) => row.id === contractId) ?? initial;
  const contract = stored ? withTotals(stored) : null;

  if (!contract) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">That subcontract is not in this session.</p>
        <Button variant="outline" asChild>
          <Link href="/subcontracts">Back to subcontracts</Link>
        </Button>
      </div>
    );
  }

  const draws = [...contract.draws].sort((a, b) => a.drawDate.localeCompare(b.drawDate));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{contract.projectName}</p>
            <h2 className="text-xl font-semibold">{contract.title}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <Users className="size-4" />
              {contract.leadName}
              {contract.leadPhone ? ` · ${contract.leadPhone}` : ""}
            </p>
          </div>
          <Badge tone={contract.status === "COMPLETED" ? "success" : contract.status === "TERMINATED" ? "warning" : "neutral"}>
            {contract.status}
          </Badge>
        </div>
        <p className="mt-3 text-sm">Team: {contract.teamMembers.map((member) => member.name).join(", ") || "No extra workers"}</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>Disbursed {formatInr(contract.totalAdvances)}</span>
            <span>Remaining {formatInr(contract.remainingBalance)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-600" style={{ width: `${contract.progress}%` }} />
          </div>
        </div>
        {contract.status === "COMPLETED" ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" />
            The contract value has been fully advanced.
          </p>
        ) : (
          <Button className="mt-4" type="button" onClick={() => setDrawing(true)} disabled={contract.remainingBalance <= 0}>
            <ArrowDownCircle />
            Issue advance
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draws.map((draw) => (
              <TableRow key={draw.id}>
                <TableCell>{format(parseISO(draw.drawDate), "d MMM yyyy")}</TableCell>
                <TableCell className="font-mono">{formatInr(draw.amountPaid)}</TableCell>
                <TableCell>{draw.paymentMode}</TableCell>
                <TableCell>{draw.referenceNumber || "—"}</TableCell>
                <TableCell>{draw.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      <Button variant="outline" asChild>
        <Link href="/subcontracts">Back to subcontracts</Link>
      </Button>
      {drawing ? (
        <IssueDrawModal
          contract={contract}
          onClose={() => setDrawing(false)}
          onIssued={(issued) => {
            const draw: SubcontractDraw = {
              id: crypto.randomUUID(),
              subcontractId: contract.id,
              drawDate: new Date().toISOString().slice(0, 10),
              amountPaid: issued.amountPaid,
              paymentMode: issued.paymentMode,
              referenceNumber: issued.referenceNumber || null,
              notes: issued.notes || null,
            };
            const next = withTotals({ ...contract, draws: [...contract.draws, draw] });
            const current = readSubcontractSession();
            writeSubcontractSession({
              ...current,
              contracts: [...current.contracts.filter((row) => row.id !== next.id), next],
            });
            setNotice(`${formatInr(issued.amountPaid)} recorded. Remaining ${formatInr(next.remainingBalance)}.`);
            setDrawing(false);
          }}
        />
      ) : null}
    </div>
  );
}
