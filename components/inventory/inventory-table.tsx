"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { Package } from "lucide-react";
import type { CatalogItem } from "@/actions/inventory-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/lib/money";

export function InventoryTable({
  items,
  onAdjust,
}: {
  items: CatalogItem[];
  onAdjust: (item: CatalogItem) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns = useMemo<LegacyColumnDef<CatalogItem>[]>(
    () => [
      { accessorKey: "name", header: "Material" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "unitType", header: "Unit" },
      {
        accessorKey: "centralRate",
        header: "Central rate",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.centralRate)}</span>,
      },
      {
        accessorKey: "currentStock",
        header: "Current stock",
        cell: ({ row }) => <span className="font-mono">{row.original.currentStock}</span>,
      },
      {
        accessorKey: "lowStockThreshold",
        header: "Threshold",
        cell: ({ row }) => <span className="font-mono">{row.original.lowStockThreshold}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.lowStock ? (
            <Badge tone="warning">Low stock</Badge>
          ) : (
            <Badge tone="success">In stock</Badge>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(row.original)}>
            Adjust
          </Button>
        ),
      },
    ],
    [onAdjust],
  );

  const table = useLegacyTable({
    data: items,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-8 text-sm text-muted-foreground">
        <Package className="size-4" />
        No materials match this filter.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={header.column.getToggleSortingHandler()}
                    >
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
            <TableRow key={row.id} className={row.original.lowStock ? "bg-amber-50" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
