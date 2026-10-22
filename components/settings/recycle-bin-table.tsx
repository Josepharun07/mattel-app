"use client";

import { useState, useSyncExternalStore } from "react";
import { format, parseISO } from "date-fns";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import {
  AlertOctagon,
  Building,
  FileText,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { purgeAllOldRecords, purgeEntityPermanently, restoreEntity } from "@/actions/governance-actions";
import { HardPurgeModal } from "@/components/settings/hard-purge-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deletionAgeLabel,
  entityLabel,
  isHighRiskEntity,
  matchesGovernanceFilter,
  recordsOlderThan,
  summarizeGovernance,
  type DeletedEntity,
  type GovernanceEntityType,
  type GovernanceFilter,
} from "@/lib/engines/governance-engine";
import {
  hideGovernanceRows,
  readGovernanceSession,
  serverGovernanceSession,
  subscribeGovernanceSession,
} from "@/lib/governance/session";

const filters: { id: GovernanceFilter; label: string }[] = [
  { id: "all", label: "All Entities" },
  { id: "parties", label: "Clients & Projects" },
  { id: "finance", label: "Finance" },
  { id: "stock", label: "Inventory & Assets" },
  { id: "people", label: "Staff & Payroll" },
];

const icons: Record<GovernanceEntityType, LucideIcon> = {
  clients: Users,
  projects: Building,
  invoices: FileText,
  ledger_entries: FileText,
  inventory_items: Package,
  asset_rentals: Wrench,
  staff: Users,
  subcontracts: Wrench,
  resort_leases: Building,
};

export function RecycleBinTable({ initial }: { initial: DeletedEntity[] }) {
  const session = useSyncExternalStore(
    subscribeGovernanceSession,
    readGovernanceSession,
    serverGovernanceSession,
  );
  const [filter, setFilter] = useState<GovernanceFilter>("all");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "deletedAt", desc: true }]);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [purgeTarget, setPurgeTarget] = useState<DeletedEntity | "old" | null>(null);

  const hidden = new Set(session.hiddenIds);
  const visible = initial.filter((row) => !hidden.has(row.id));
  const now = new Date();
  const stats = summarizeGovernance(visible, now);
  const needle = query.trim().toLowerCase();
  const rows = visible.filter((row) => {
    if (!matchesGovernanceFilter(row.entityType, filter)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [row.nameOrTitle, row.details, row.entityType, entityLabel(row.entityType), row.id]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  const oldCount = recordsOlderThan(visible, 90, now).length;

  const columns: LegacyColumnDef<DeletedEntity>[] = [
    {
      id: "entityType",
      header: "Type",
      accessorFn: (row) => entityLabel(row.entityType),
      cell: ({ row }) => {
        const Icon = icons[row.original.entityType];
        return (
          <Badge tone={isHighRiskEntity(row.original.entityType) ? "warning" : "neutral"}>
            <Icon className="mr-1 size-3" />
            {entityLabel(row.original.entityType)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "nameOrTitle",
      header: "Record",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.nameOrTitle}</p>
          <p className="text-xs text-muted-foreground">{row.original.details}</p>
        </div>
      ),
    },
    {
      accessorKey: "deletedAt",
      header: "Deleted",
      cell: ({ row }) => format(parseISO(row.original.deletedAt), "d MMM yyyy"),
    },
    {
      id: "age",
      header: "Elapsed",
      accessorFn: (row) => row.deletedAt,
      cell: ({ row }) => deletionAgeLabel(row.original.deletedAt, now),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busyId === row.original.id}
            aria-label={`Restore ${row.original.nameOrTitle}`}
            onClick={() => {
              setBusyId(row.original.id);
              void restoreEntity(row.original.entityType, row.original.id)
                .then((result) => {
                  if (result.success || result.offline) {
                    hideGovernanceRows([row.original.id, ...(result.parentIds ?? [])]);
                  }
                  setNotice(result.message);
                })
                .finally(() => setBusyId(""));
            }}
          >
            <RefreshCw />
            Restore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            aria-label={`Permanently delete ${row.original.nameOrTitle}`}
            onClick={() => setPurgeTarget(row.original)}
          >
            <Trash2 />
            Permanently delete
          </Button>
        </div>
      ),
    },
  ];

  const table = useLegacyTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const purgeTitle =
    purgeTarget === "old"
      ? `${oldCount} records older than 90 days`
      : purgeTarget
        ? `${entityLabel(purgeTarget.entityType)} ${purgeTarget.nameOrTitle}`
        : "";
  const purgeDetail =
    purgeTarget === "old"
      ? "Every archived record older than 90 days will be removed."
      : purgeTarget
        ? purgeTarget.details
        : "";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Soft-deleted items" value={String(stats.total)} icon={Trash2} />
        <Stat label="Deleted in the last 7 days" value={String(stats.recent)} icon={RefreshCw} />
        <Stat label="Reclaimable space" value={stats.reclaimableLabel} icon={Package} />
        <Stat label="High-risk financial records" value={String(stats.highRisk)} icon={ShieldAlert} />
      </div>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, type, or reference"
            aria-label="Search archived records"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setPurgeTarget("old")} disabled={oldCount === 0}>
          <AlertOctagon />
          Purge records older than 90 days
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No archived records in this view.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <HardPurgeModal
        open={purgeTarget !== null}
        title={purgeTitle}
        detail={purgeDetail}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
          }
        }}
        onConfirm={async (confirmationText) => {
          if (purgeTarget === "old") {
            const result = await purgeAllOldRecords(90, confirmationText);
            if ((result.success || result.offline) && result.ids) {
              hideGovernanceRows(result.ids);
            }
            setNotice(result.message);
          } else if (purgeTarget) {
            const result = await purgeEntityPermanently(
              purgeTarget.entityType,
              purgeTarget.id,
              confirmationText,
            );
            if (result.success || result.offline) {
              hideGovernanceRows([purgeTarget.id]);
            }
            setNotice(result.message);
          }
          setPurgeTarget(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="text-lg font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}
