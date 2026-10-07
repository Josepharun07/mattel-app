"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContractStatus } from "@/lib/engines/subcontract-engine";
import { formatInr } from "@/lib/money";
import type { SubcontractRecord } from "@/lib/subcontracts/types";

const statusTone: Record<ContractStatus, "neutral" | "success" | "warning"> = {
  ACTIVE: "neutral",
  COMPLETED: "success",
  TERMINATED: "warning",
};

function leadLabel(contract: SubcontractRecord) {
  if (contract.leadPersonType === "INTERNAL_WORKER") {
    return contract.leadName;
  }
  return `${contract.leadName}${contract.leadPhone ? ` · ${contract.leadPhone}` : ""}`;
}

export function SubcontractTable({
  contracts,
  onDraw,
}: {
  contracts: SubcontractRecord[];
  onDraw: (contract: SubcontractRecord) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<SubcontractRecord>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Work",
        cell: ({ row }) => (
          <Link href={`/subcontracts/${row.original.id}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
        ),
      },
      { accessorKey: "projectName", header: "Project" },
      { id: "lead", header: "Team lead", accessorFn: (row) => leadLabel(row) },
      {
        accessorKey: "totalContractAmount",
        header: "Contract",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.totalContractAmount)}</span>,
      },
      {
        accessorKey: "totalAdvances",
        header: "Advances",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.totalAdvances)}</span>,
      },
      {
        accessorKey: "remainingBalance",
        header: "Remaining",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.remainingBalance)}</span>,
      },
      {
        accessorKey: "progress",
        header: "Paid",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-600" style={{ width: `${row.original.progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{row.original.progress}%</span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge tone={statusTone[row.original.status]}>{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" disabled={row.original.remainingBalance <= 0 || row.original.status === "TERMINATED"} onClick={() => onDraw(row.original)}>
            <ArrowDownCircle />
            Draw
          </Button>
        ),
      },
    ],
    [onDraw],
  );
  const table = useLegacyTable({
    data: contracts,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <button type="button" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>No subcontracts match this view.</TableCell>
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
  );
}
