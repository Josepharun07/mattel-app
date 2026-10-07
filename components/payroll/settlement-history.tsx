"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { updateFinalizedSettlement } from "@/actions/payroll-actions";
import { VersionBadge } from "@/components/documents/version-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyPayslipVersionSuffix, issuePayslipNumber, recalculateSettlement } from "@/lib/engines/payroll-engine";
import { formatInr } from "@/lib/money";
import { mergeById } from "@/lib/payroll/merge";
import { readPayrollSession, serverPayrollSession, subscribePayrollSession, writePayrollSession } from "@/lib/payroll/session";
import type { SettlementRow } from "@/lib/payroll/types";

const labels = {
  WEEKLY_CYCLED: "Weekly cycle",
  MID_WEEK_CHECKOUT: "Mid-week checkout",
} as const;

export function SettlementHistory({ initialRows }: { initialRows: SettlementRow[] }) {
  const session = useSyncExternalStore(subscribePayrollSession, readPayrollSession, serverPayrollSession);
  const rows = withSlips(mergeById(initialRows, session.settlements)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const [editing, setEditing] = useState<SettlementRow | null>(null);
  const [days, setDays] = useState("");
  const [overtime, setOvertime] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  function openRevision(row: SettlementRow) {
    setEditing(row);
    setDays(String(row.daysPresent));
    setOvertime(String(row.totalOvertimeHours));
    setAmountPaid(String(row.amountPaid));
    setNotes(row.notes ?? "");
    setMessage("");
  }

  function remember(next: SettlementRow) {
    const current = readPayrollSession();
    writePayrollSession({
      ...current,
      settlements: mergeById(current.settlements, [next]),
    });
  }
  const columns = useMemo<LegacyColumnDef<SettlementRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy, h:mm a"),
      },
      { accessorKey: "staffName", header: "Worker" },
      {
        id: "slip",
        header: "Payslip",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-mono text-xs">
            {row.original.payslipNumber || "—"}
            <VersionBadge version={row.original.version ?? 0} />
          </span>
        ),
      },
      {
        id: "period",
        header: "Period",
        cell: ({ row }) =>
          `${format(parseISO(row.original.periodStart), "d MMM")} – ${format(parseISO(row.original.periodEnd), "d MMM")}`,
      },
      {
        accessorKey: "checkoutType",
        header: "Type",
        cell: ({ row }) => labels[row.original.checkoutType],
      },
      { accessorKey: "daysPresent", header: "Days" },
      { accessorKey: "totalOvertimeHours", header: "OT hours" },
      {
        accessorKey: "grossPayable",
        header: "Gross",
        cell: ({ row }) => <span className="font-mono">{formatInr(row.original.grossPayable)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "PAID" ? "success" : "warning"}>{row.original.status}</Badge>
        ),
      },
      {
        id: "revise",
        header: "",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" onClick={() => openRevision(row.original)}>
            Revise
          </Button>
        ),
      },
    ],
    [],
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
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payouts have been recorded yet.</p>
      ) : (
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
      )}
      <Button variant="outline" asChild>
        <Link href="/payroll">Back to payroll</Link>
      </Button>
      {editing ? (
        <Dialog open onOpenChange={(open) => { if (!open) setEditing(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revise {editing.payslipNumber || editing.staffName}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const payload = {
                  daysPresent: Number(days),
                  totalOvertimeHours: Number(overtime),
                  amountPaid: Number(amountPaid),
                  notes,
                };
                const result = await updateFinalizedSettlement(editing.id, payload);
                if (!result.success && !result.offline) {
                  setMessage(result.message);
                  return;
                }
                const next = result.success && result.settlement
                  ? result.settlement
                  : reviseSlip(editing, payload);
                remember(next);
                setMessage(`${next.payslipNumber} saved.`);
                setEditing(null);
              }}
            >
              <label className="space-y-1 text-sm">
                <Label>Days present</Label>
                <Input value={days} onChange={(event) => setDays(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Overtime hours</Label>
                <Input value={overtime} onChange={(event) => setOvertime(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Amount paid</Label>
                <Input value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Notes</Label>
                <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
              {message ? <p className="text-sm text-amber-800">{message}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit">Save revision</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function withSlips(rows: SettlementRow[]) {
  const taken: string[] = [];
  return [...rows]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((row) => {
      if (row.basePayslipNumber && row.payslipNumber) {
        taken.push(row.basePayslipNumber);
        return row;
      }
      const issued = issuePayslipNumber(taken, row.createdAt || row.periodEnd);
      taken.push(issued.basePayslipNumber);
      const version = row.version ?? 0;
      return {
        ...row,
        basePayslipNumber: issued.basePayslipNumber,
        payslipNumber: applyPayslipVersionSuffix(issued.basePayslipNumber, version),
        version,
      };
    });
}

function reviseSlip(
  row: SettlementRow,
  input: { daysPresent: number; totalOvertimeHours: number; amountPaid: number; notes: string },
): SettlementRow {
  const daily = row.daysPresent > 0 ? row.basePay / row.daysPresent : 0;
  const hourly = row.totalOvertimeHours > 0 ? row.overtimePay / row.totalOvertimeHours : 0;
  const figures = recalculateSettlement({
    dailyBaseRate: daily,
    hourlyRate: hourly,
    daysPresent: input.daysPresent,
    totalOvertimeHours: input.totalOvertimeHours,
    priorBalanceCarryover: row.priorBalanceCarryover ?? 0,
    priorAdvanceCarryover: row.priorAdvanceCarryover ?? 0,
    currentCycleAdvances: row.currentCycleAdvances ?? 0,
    amountPaid: input.amountPaid,
  });
  const version = (row.version ?? 0) + 1;
  const basePayslipNumber = row.basePayslipNumber || (row.payslipNumber || "").replace(/-v\d+$/, "");
  return {
    ...row,
    ...figures,
    version,
    basePayslipNumber,
    payslipNumber: applyPayslipVersionSuffix(basePayslipNumber, version),
    notes: input.notes.trim() || row.notes,
  };
}
