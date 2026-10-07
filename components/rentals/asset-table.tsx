"use client";

import { useMemo, useState } from "react";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { AlertTriangle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RentalAsset } from "@/lib/rentals/types";

const statusLabel = {
  AVAILABLE: "Available",
  RENTED_INTERNAL: "Internal",
  RENTED_EXTERNAL: "External",
  MAINTENANCE: "Maintenance",
} as const;

function assignee(asset: RentalAsset) {
  const assignment = asset.assignment;
  if (!assignment) {
    return "—";
  }
  if (assignment.borrowerType === "INTERNAL_WORKER") {
    return assignment.staffName ?? "Internal worker";
  }
  return `${assignment.externalBorrowerName ?? "External renter"}${assignment.externalBorrowerPhone ? ` · ${assignment.externalBorrowerPhone}` : ""}`;
}

export function AssetTable({
  assets,
  onAssign,
  onReturn,
}: {
  assets: RentalAsset[];
  onAssign: (asset: RentalAsset) => void;
  onReturn: (asset: RentalAsset) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<RentalAsset>[]>(
    () => [
      { accessorKey: "assetName", header: "Asset" },
      { accessorKey: "serialNumber", header: "Serial" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.overdue ? (
            <Badge tone="warning">
              <AlertTriangle className="mr-1 size-3" />
              Overdue
            </Badge>
          ) : (
            <Badge tone={row.original.currentStatus === "AVAILABLE" ? "success" : "neutral"}>
              {statusLabel[row.original.currentStatus]}
            </Badge>
          ),
      },
      { id: "assignee", header: "Assigned to", cell: ({ row }) => assignee(row.original) },
      {
        id: "issue",
        header: "Issued",
        cell: ({ row }) => row.original.assignment?.issueDate ?? "—",
      },
      {
        id: "deadline",
        header: "Deadline",
        cell: ({ row }) => row.original.assignment?.expectedReturnDate ?? "—",
      },
      {
        id: "overdue",
        header: "Overdue days",
        cell: ({ row }) => (row.original.daysOverdue > 0 ? row.original.daysOverdue : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          row.original.assignment ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onReturn(row.original)}>
              Return
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={row.original.currentStatus === "MAINTENANCE"} onClick={() => onAssign(row.original)}>
              <Wrench />
              Issue
            </Button>
          ),
      },
    ],
    [onAssign, onReturn],
  );
  const table = useLegacyTable({
    data: assets,
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
                    <button type="button" className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={row.original.overdue ? "bg-amber-50" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
