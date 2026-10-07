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
import { ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/lib/money";
import type { PayrollSummaryRow } from "@/lib/payroll/types";

export function WeeklySummaryTable({
  rows,
  busy,
  onMidWeek,
  onWeeklySettle,
}: {
  rows: PayrollSummaryRow[];
  busy: boolean;
  onMidWeek: (row: PayrollSummaryRow) => void;
  onWeeklySettle: (row: PayrollSummaryRow) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<PayrollSummaryRow>[]>(
    () => [
      { accessorKey: "fullName", header: "Worker" },
      { accessorKey: "role", header: "Role" },
      {
        accessorKey: "dailyBaseRate",
        header: "Base rate",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.dailyBaseRate)}</span>,
      },
      {
        accessorKey: "hourlyRate",
        header: "OT rate",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.hourlyRate)}</span>,
      },
      { accessorKey: "daysPresent", header: "Unsettled days" },
      { accessorKey: "totalOvertimeHours", header: "OT hours" },
      {
        accessorKey: "grossPayable",
        header: "Gross payable",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.grossPayable)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onMidWeek(row.original)}>
              <ArrowRightLeft />
              Mid-week checkout
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => onWeeklySettle(row.original)}>
              <CheckCircle2 />
              Full weekly settle
            </Button>
          </div>
        ),
      },
    ],
    [busy, onMidWeek, onWeeklySettle],
  );
  const table = useLegacyTable({
    data: rows,
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
            <TableRow key={row.id}>
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
