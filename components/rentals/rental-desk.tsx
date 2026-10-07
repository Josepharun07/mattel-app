"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, FileText, Wrench } from "lucide-react";
import { AssignAssetModal } from "@/components/rentals/assign-asset-modal";
import { AssetTable } from "@/components/rentals/asset-table";
import { ReturnAssetModal } from "@/components/rentals/return-asset-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calendarDay, isRentalOverdue, overdueDays, statusForBorrower } from "@/lib/engines/rental-engine";
import { formatInr } from "@/lib/money";
import { readRentalSession, serverRentalSession, subscribeRentalSession, writeRentalSession } from "@/lib/rentals/session";
import type { RentalAsset, RentalAssignment, RentalDirectory } from "@/lib/rentals/types";

export function RentalDesk({ initial }: { initial: RentalDirectory }) {
  const session = useSyncExternalStore(subscribeRentalSession, readRentalSession, serverRentalSession);
  const [query, setQuery] = useState("");
  const [borrowerFilter, setBorrowerFilter] = useState<"ALL" | "INTERNAL_WORKER" | "EXTERNAL_RENTER" | "OVERDUE">("ALL");
  const [issuing, setIssuing] = useState<RentalAsset | null>(null);
  const [returning, setReturning] = useState<RentalAsset | null>(null);
  const [notice, setNotice] = useState("");

  const history = useMemo(() => {
    const map = new Map(initial.history.map((row) => [row.id, row]));
    for (const row of session.assignments) {
      map.set(row.id, row);
    }
    return [...map.values()];
  }, [initial.history, session.assignments]);

  const assets = initial.assets.map((asset) => {
    const assignment = history.find((row) => row.assetId === asset.id && !row.actualReturnDate) ?? null;
    const currentStatus = session.statuses[asset.id] ?? (assignment ? statusForBorrower(assignment.borrowerType) : asset.assignment ? asset.currentStatus : "AVAILABLE");
    return {
      ...asset,
      currentStatus: assignment ? statusForBorrower(assignment.borrowerType) : currentStatus,
      assignment,
      overdue: assignment?.overdue ?? false,
      daysOverdue: assignment?.daysOverdue ?? 0,
    };
  });

  const filtered = assets.filter((asset) => {
    const haystack = `${asset.assetName} ${asset.category} ${asset.serialNumber ?? ""} ${asset.assignment?.externalBorrowerPhone ?? ""}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesBorrower =
      borrowerFilter === "ALL" ||
      (borrowerFilter === "OVERDUE" && asset.overdue) ||
      asset.assignment?.borrowerType === borrowerFilter;
    return matchesQuery && matchesBorrower;
  });

  const assignedInternal = assets.filter((asset) => asset.currentStatus === "RENTED_INTERNAL").length;
  const assignedExternal = assets.filter((asset) => asset.currentStatus === "RENTED_EXTERNAL").length;
  const overdueCount = assets.filter((asset) => asset.overdue).length;
  const revenue = history.reduce((sum, row) => sum + row.totalRentCharged, 0);

  function persist(nextHistory: RentalAssignment[], assetId: string, status: RentalAsset["currentStatus"]) {
    const current = readRentalSession();
    const assignments = [...current.assignments.filter((row) => !nextHistory.some((item) => item.id === row.id)), ...nextHistory];
    writeRentalSession({ assignments, statuses: { ...current.statuses, [assetId]: status } });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Wrench className="size-4" />} label="Assets" value={String(assets.length)} />
        <Card icon={<FileText className="size-4" />} label="Assigned" value={`${assignedInternal} internal · ${assignedExternal} external`} />
        <Card
          icon={<AlertTriangle className="size-4" />}
          label="Overdue"
          value={String(overdueCount)}
          badge={overdueCount > 0 ? <Badge tone="warning">{overdueCount} alerts</Badge> : <Badge tone="success">Clear</Badge>}
        />
        <Card icon={<Calendar className="size-4" />} label="Rental revenue" value={formatInr(revenue)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search name, category, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
        {(["ALL", "INTERNAL_WORKER", "EXTERNAL_RENTER", "OVERDUE"] as const).map((filter) => (
          <Button key={filter} type="button" size="sm" variant={borrowerFilter === filter ? "default" : "outline"} onClick={() => setBorrowerFilter(filter)}>
            {filter === "ALL" ? "All" : filter === "INTERNAL_WORKER" ? "Internal" : filter === "EXTERNAL_RENTER" ? "External" : "Overdue"}
          </Button>
        ))}
        <Button variant="outline" asChild>
          <Link href="/rentals/history">Rental audit log</Link>
        </Button>
      </div>
      <AssetTable assets={filtered} onAssign={setIssuing} onReturn={setReturning} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {issuing ? (
        <AssignAssetModal
          asset={issuing}
          staff={initial.staff}
          projects={initial.projects}
          onClose={() => setIssuing(null)}
          onIssued={(issued) => {
            const staffName = initial.staff.find((person) => person.id === issued.staffId)?.fullName ?? null;
            const projectName = initial.projects.find((site) => site.id === issued.projectId)?.name ?? null;
            const today = calendarDay();
            const row: RentalAssignment = {
              id: crypto.randomUUID(),
              assetId: issuing.id,
              assetName: issuing.assetName,
              borrowerType: issued.borrowerType,
              staffId: issued.staffId ?? null,
              staffName,
              projectId: issued.projectId ?? null,
              projectName,
              externalBorrowerName: issued.externalBorrowerName ?? null,
              externalBorrowerPhone: issued.externalBorrowerPhone ?? null,
              externalIdDetails: issued.externalIdDetails ?? null,
              issueDate: today,
              expectedReturnDate: issued.expectedReturnDate,
              actualReturnDate: null,
              conditionOnIssue: issued.conditionOnIssue,
              conditionOnReturn: null,
              dailyRateApplied: issued.dailyRateApplied,
              totalRentCharged: 0,
              comments: issued.comments ?? null,
              overdue: isRentalOverdue(issued.expectedReturnDate, null, today),
              daysOverdue: overdueDays(issued.expectedReturnDate, null, today),
            };
            persist([row], issuing.id, statusForBorrower(issued.borrowerType));
            setNotice(`${issuing.assetName} issued.`);
            setIssuing(null);
          }}
        />
      ) : null}
      {returning?.assignment ? (
        <ReturnAssetModal
          asset={returning}
          onClose={() => setReturning(null)}
          onReturned={(result) => {
            const assignment = returning.assignment;
            if (!assignment) {
              return;
            }
            const closed: RentalAssignment = {
              ...assignment,
              actualReturnDate: result.returnedOn,
              conditionOnReturn: result.condition,
              totalRentCharged: result.totalRentCharged,
              comments: result.notes || assignment.comments,
              overdue: false,
              daysOverdue: 0,
            };
            persist([closed], returning.id, "AVAILABLE");
            setNotice(`${returning.assetName} returned · ${formatInr(result.totalRentCharged)}.`);
            setReturning(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Card({ icon, label, value, badge }: { icon: ReactNode; label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xl font-semibold">{value}</p>
        {badge}
      </div>
    </div>
  );
}
