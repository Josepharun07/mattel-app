"use client";

import { useState } from "react";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, RotateCcw, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LedgerEntryView } from "@/lib/ledger/sample";
import { formatInr } from "@/lib/money";

function SelectBox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      ref={(node) => {
        if (node) {
          node.indeterminate = Boolean(indeterminate);
        }
      }}
      type="checkbox"
      className="size-4 accent-blue-600"
      aria-label={label}
      checked={checked}
      onChange={onChange}
    />
  );
}

export function UnbilledLedgerTable({
  rows,
  selectedIds,
  query,
  rateInputs,
  onToggle,
  onToggleAll,
  onRateChange,
  onRateCommit,
  onResetRate,
}: {
  rows: LedgerEntryView[];
  selectedIds: string[];
  query: string;
  rateInputs: Record<string, string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onRateChange: (id: string, value: string) => void;
  onRateCommit: (id: string, value: string) => void;
  onResetRate: (row: LedgerEntryView) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const columns: LegacyColumnDef<LedgerEntryView>[] = [
    {
      id: "select",
      enableSorting: false,
      header: ({ table }) => {
        const ids = table.getFilteredRowModel().rows.map((row) => row.original.id);
        const all = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
        const some = ids.some((id) => selectedIds.includes(id));
        return (
          <SelectBox
            checked={all}
            indeterminate={!all && some}
            label="Select all unbilled rows"
            onChange={() => onToggleAll(ids, !all)}
          />
        );
      },
      cell: ({ row }) => (
        <SelectBox
          checked={selectedIds.includes(row.original.id)}
          label={`Select ${row.original.description}`}
          onChange={() => onToggle(row.original.id)}
        />
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => format(parseISO(row.original.createdAt), "d MMM yyyy"),
    },
    {
      accessorKey: "description",
      header: "Material / activity",
      cell: ({ row }) => <span className="max-w-xs">{row.original.description}</span>,
    },
    {
      id: "source",
      header: "Source",
      accessorFn: (row) => row.source,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.source === "CENTRAL_INVENTORY" ? (
          <Badge tone="success">Inventory draw</Badge>
        ) : (
          <Badge>Direct</Badge>
        ),
    },
    {
      id: "quantity",
      header: "Quantity",
      accessorFn: (row) => row.quantity,
      cell: ({ row }) => (
        <span className="font-mono">
          {row.original.quantity} {row.original.unitType}
        </span>
      ),
    },
    {
      accessorKey: "centralRate",
      header: "Central rate",
      cell: ({ row }) => <span className="font-mono">{formatInr(row.original.centralRate)}</span>,
    },
    {
      id: "override",
      header: "Override rate",
      enableSorting: false,
      cell: ({ row }) => {
        const dirty = row.original.overrideRate !== row.original.centralRate;
        return (
          <span className="flex items-center gap-1">
            <Input
              className="h-8 w-28 font-mono"
              aria-label={`Override rate for ${row.original.description}`}
              value={rateInputs[row.original.id] ?? String(row.original.overrideRate)}
              onChange={(event) => onRateChange(row.original.id, event.target.value)}
              onBlur={(event) => onRateCommit(row.original.id, event.target.value)}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Reset ${row.original.description} to the central rate`}
              disabled={!dirty}
              onClick={() => onResetRate(row.original)}
            >
              <RotateCcw />
            </Button>
          </span>
        );
      },
    },
    {
      accessorKey: "finalPrice",
      header: "Line total",
      cell: ({ row }) => <span className="font-mono">{formatInr(row.original.finalPrice)}</span>,
    },
    {
      id: "transit",
      header: "Transit / e-way",
      enableSorting: false,
      cell: ({ row }) => {
        const pass = row.original.transitPassNo;
        const eway = row.original.ewayBillNo;
        const vehicle = row.original.vehicleNumber;
        if (!pass && !eway && !vehicle) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="block text-xs">
            {pass ? (
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="size-3" /> {pass}
              </span>
            ) : null}
            {eway ? <span className="block">{eway}</span> : null}
            {vehicle ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Truck className="size-3" /> {vehicle}
              </span>
            ) : null}
          </span>
        );
      },
    },
  ];

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { sorting, pagination, globalFilter: query },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue ?? "").trim().toLowerCase();
      if (!needle) {
        return true;
      }
      return [row.original.description, row.original.vehicleNumber, row.original.transitPassNo, row.original.ewayBillNo]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    },
  });

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <Table className="min-w-[980px]">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button type="button" className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                No unbilled rows match this filter.
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
  );
}
