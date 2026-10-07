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
import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/lib/money";
import type { ResortLease } from "@/lib/resort/types";

const tone = { ACTIVE: "success", EXPIRED: "warning", TERMINATED: "neutral" } as const;

export function LeaseTable({
  leases,
  onInvoice,
}: {
  leases: ResortLease[];
  onInvoice: (lease: ResortLease) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<ResortLease>[]>(
    () => [
      { accessorKey: "propertyName", header: "Property" },
      {
        id: "operator",
        header: "Operator",
        accessorFn: (row) => `${row.operatorName} ${row.operatorContact}`,
        cell: ({ row }) => (
          <span>
            {row.original.operatorName}
            <span className="block text-xs text-muted-foreground">{row.original.operatorContact}</span>
          </span>
        ),
      },
      {
        accessorKey: "monthlyRentAmount",
        header: "Monthly rent",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.monthlyRentAmount)}</span>,
      },
      { accessorKey: "billingDueDay", header: "Due day" },
      {
        accessorKey: "leaseEndDate",
        header: "Lease expiry",
        cell: ({ row }) => format(parseISO(row.original.leaseEndDate), "d MMM yyyy"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge tone={tone[row.original.status]}>{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" disabled={row.original.status !== "ACTIVE"} onClick={() => onInvoice(row.original)}>
            <FileText />
            Generate monthly invoice
          </Button>
        ),
      },
    ],
    [onInvoice],
  );
  const table = useLegacyTable({
    data: leases,
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
