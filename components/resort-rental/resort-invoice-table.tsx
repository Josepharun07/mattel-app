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
import { AlertCircle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { VersionBadge } from "@/components/documents/version-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paymentStatusLabel } from "@/lib/engines/resort-engine";
import { formatInr } from "@/lib/money";
import type { ResortInvoice } from "@/lib/resort/types";

export function ResortInvoiceTable({
  invoices,
  onCollect,
}: {
  invoices: ResortInvoice[];
  onCollect: (invoice: ResortInvoice) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<ResortInvoice>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-mono text-xs">
            {row.original.invoiceNumber}
            <VersionBadge version={row.original.version} />
            {row.original.overdue ? <AlertCircle className="size-4 text-amber-700" /> : null}
          </span>
        ),
      },
      { accessorKey: "billingPeriod", header: "Period" },
      { accessorKey: "propertyName", header: "Property" },
      { accessorKey: "operatorName", header: "Operator" },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {row.original.dueDate}
          </span>
        ),
      },
      {
        accessorKey: "grandTotal",
        header: "Total",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.grandTotal)}</span>,
      },
      {
        accessorKey: "amountPaid",
        header: "Collected",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.amountPaid)}</span>,
      },
      {
        accessorKey: "paymentStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.paymentStatus === "PAID" ? "success" : row.original.paymentStatus === "PARTIALLY_PAID" ? "warning" : "neutral"}>
            {row.original.paymentStatus === "PAID" ? <CheckCircle2 className="mr-1 size-3" /> : null}
            {paymentStatusLabel(row.original.paymentStatus)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" disabled={row.original.paymentStatus === "PAID"} onClick={() => onCollect(row.original)}>
            <DollarSign />
            Record collection
          </Button>
        ),
      },
    ],
    [onCollect],
  );
  const table = useLegacyTable({
    data: invoices,
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
