"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/lib/money";
import { readRentalSession, serverRentalSession, subscribeRentalSession } from "@/lib/rentals/session";
import type { RentalAssignment } from "@/lib/rentals/types";

export function RentalHistory({ initial }: { initial: RentalAssignment[] }) {
  const session = useSyncExternalStore(subscribeRentalSession, readRentalSession, serverRentalSession);
  const rows = useMemo(() => {
    const map = new Map(initial.map((row) => [row.id, row]));
    for (const row of session.assignments) {
      map.set(row.id, row);
    }
    return [...map.values()].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [initial, session.assignments]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<LegacyColumnDef<RentalAssignment>[]>(
    () => [
      { accessorKey: "assetName", header: "Asset" },
      {
        id: "borrower",
        header: "Borrower",
        cell: ({ row }) =>
          row.original.borrowerType === "INTERNAL_WORKER"
            ? row.original.staffName
            : `${row.original.externalBorrowerName ?? ""} ${row.original.externalBorrowerPhone ?? ""}`,
      },
      { accessorKey: "issueDate", header: "Issued" },
      { accessorKey: "expectedReturnDate", header: "Deadline" },
      { accessorKey: "actualReturnDate", header: "Returned" },
      { accessorKey: "conditionOnReturn", header: "Condition" },
      {
        accessorKey: "totalRentCharged",
        header: "Rent",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.totalRentCharged)}</span>,
      },
      {
        id: "state",
        header: "State",
        cell: ({ row }) =>
          row.original.actualReturnDate ? (
            <Badge tone="success">Returned</Badge>
          ) : row.original.overdue ? (
            <Badge tone="warning">Overdue</Badge>
          ) : (
            <Badge>Open</Badge>
          ),
      },
    ],
    [],
  );
  const table = useLegacyTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" asChild>
        <Link href="/rentals">Back to rentals</Link>
      </Button>
    </div>
  );
}
