"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Button } from "@/views/ui/button";
import { Badge } from "@/views/ui/badge";
import { formatInr } from "@/lib/money";
import type { SettlementRow } from "@/lib/payroll/types";

const kinds = {
  WEEKLY_CYCLED: "Weekly cycle",
  MID_WEEK_CHECKOUT: "Mid-week checkout",
} as const;

export function EmployeePayouts({
  person,
  payouts,
}: {
  person: { id: string; fullName: string; role: string; email: string };
  payouts: SettlementRow[];
}) {
  const [printing, setPrinting] = useState<SettlementRow | null>(null);
  const rows = [...payouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{rows.length} payslip{rows.length === 1 ? "" : "s"}{person.email ? ` · ${person.email}` : ""}</p>
          <Button variant="outline" asChild>
            <Link href="/payroll">Back to payroll</Link>
          </Button>
        </div>
        {rows.length === 0 ? <p className="rounded-xl border bg-white px-4 py-6 text-sm text-muted-foreground">No payslips yet.</p> : null}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="space-y-3 rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.payslipNumber || "Payslip"}</p>
                  <p className="text-sm text-muted-foreground">
                    Settled {format(new Date(row.createdAt), "d MMM yyyy, h:mm a")} · {kinds[row.checkoutType]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(row.periodStart), "d MMM yyyy")} – {format(parseISO(row.periodEnd), "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === "PAID" ? "success" : "warning"}>{row.status === "PAID" ? "Paid" : "Pending"}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setPrinting(row); window.setTimeout(() => window.print(), 50); }}>
                    Print
                  </Button>
                </div>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Days</dt><dd>{row.daysPresent}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Overtime hours</dt><dd>{row.totalOvertimeHours}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Base pay</dt><dd className="font-mono">{formatInr(row.basePay)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Overtime pay</dt><dd className="font-mono">{formatInr(row.overtimePay)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Gross</dt><dd className="font-mono">{formatInr(row.grossEarned)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Advances</dt><dd className="font-mono">{formatInr(row.totalDeductions)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Net due</dt><dd className="font-mono">{formatInr(row.netAmountDue)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="font-medium">Paid</dt><dd className="font-mono font-medium">{formatInr(row.amountPaid)}</dd></div>
              </dl>
              {row.notes ? <p className="text-sm text-muted-foreground">{row.notes}</p> : null}
            </li>
          ))}
        </ul>
      </div>
      {printing ? (
        <article className="mx-auto hidden max-w-[720px] bg-white p-8 text-black print:block">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Mattel Infrastructures</p>
          <h1 className="mt-1 text-2xl font-semibold">Payslip {printing.payslipNumber || "Draft"}</h1>
          <p className="mt-1 text-sm">{person.fullName}</p>
          <p className="text-sm text-neutral-600">
            Settled {format(new Date(printing.createdAt), "d MMM yyyy")} · {format(parseISO(printing.periodStart), "d MMM yyyy")} – {format(parseISO(printing.periodEnd), "d MMM yyyy")}
          </p>
          <p className="mt-4 text-sm">Paid {formatInr(printing.amountPaid)}</p>
        </article>
      ) : null}
    </>
  );
}
