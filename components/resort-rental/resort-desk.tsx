"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle, Building2, Calendar, DollarSign, KeyRound } from "lucide-react";
import { GenerateLeaseInvoiceModal } from "@/components/resort-rental/generate-lease-invoice-modal";
import { LeaseTable } from "@/components/resort-rental/lease-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isResortInvoiceOverdue,
  nextResortInvoiceNumber,
  resortInvoiceTotals,
  resortPaymentStatus,
  resortRemainingBalance,
} from "@/lib/engines/resort-engine";
import { formatInr } from "@/lib/money";
import { readResortSession, serverResortSession, subscribeResortSession, writeResortSession } from "@/lib/resort/session";
import type { ResortDirectory, ResortInvoice, ResortLease } from "@/lib/resort/types";

function mergeById<T extends { id: string }>(base: T[], extra: T[]) {
  const map = new Map(base.map((row) => [row.id, row]));
  for (const row of extra) map.set(row.id, row);
  return [...map.values()];
}

export function ResortDesk({ initial }: { initial: ResortDirectory }) {
  const session = useSyncExternalStore(subscribeResortSession, readResortSession, serverResortSession);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");
  const [invoicing, setInvoicing] = useState<ResortLease | null>(null);
  const [notice, setNotice] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const monthKey = today.slice(0, 7);
  const leases = mergeById(initial.leases, session.leases);
  const invoices = mergeById(initial.invoices, session.invoices);
  const payments = mergeById(initial.payments, session.payments);
  const filtered = leases.filter((lease) => {
    const haystack = `${lease.propertyName} ${lease.operatorName} ${lease.operatorContact}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "ALL" || lease.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const recurring = leases.filter((lease) => lease.status === "ACTIVE").reduce((sum, lease) => sum + lease.monthlyRentAmount, 0);
  const collected = payments.filter((payment) => payment.paymentDate.startsWith(monthKey)).reduce((sum, payment) => sum + payment.amountPaid, 0);
  const outstanding = invoices.reduce((sum, row) => sum + Math.max(0, resortRemainingBalance(row.grandTotal, row.amountPaid)), 0);
  const overdue = invoices.filter((row) => row.overdue).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Building2 className="size-4" />} label="Monthly lease income" value={formatInr(recurring)} />
        <Card icon={<DollarSign className="size-4" />} label="Collected this month" value={formatInr(collected)} />
        <Card icon={<KeyRound className="size-4" />} label="Outstanding" value={formatInr(outstanding)} />
        <Card
          icon={<AlertCircle className="size-4" />}
          label="Overdue invoices"
          value={String(overdue)}
          badge={overdue > 0 ? <Badge tone="warning">{overdue} overdue</Badge> : <Badge tone="success">Clear</Badge>}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search property or operator" value={query} onChange={(event) => setQuery(event.target.value)} />
        {(["ALL", "ACTIVE", "EXPIRED"] as const).map((filter) => (
          <Button key={filter} type="button" size="sm" variant={statusFilter === filter ? "default" : "outline"} onClick={() => setStatusFilter(filter)}>
            {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Expired"}
          </Button>
        ))}
        <Button variant="outline" asChild>
          <Link href="/resort-rental/invoices">
            <Calendar className="size-4" />
            Invoice ledger
          </Link>
        </Button>
      </div>
      <LeaseTable leases={filtered} onInvoice={setInvoicing} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {invoicing ? (
        <GenerateLeaseInvoiceModal
          lease={invoicing}
          existingNumbers={invoices.map((row) => row.baseInvoiceNumber)}
          onClose={() => setInvoicing(null)}
          onIssued={(issued) => {
            const totals = resortInvoiceTotals(invoicing.monthlyRentAmount, issued.gstEnabled);
            const assigned = nextResortInvoiceNumber(invoices.map((row) => row.baseInvoiceNumber), issued.issueDate);
            const status = resortPaymentStatus(issued.grandTotal, 0);
            const row: ResortInvoice = {
              id: crypto.randomUUID(),
              resortLeaseId: invoicing.id,
              propertyName: invoicing.propertyName,
              operatorName: invoicing.operatorName,
              baseInvoiceNumber: assigned,
              invoiceNumber: assigned,
              version: 0,
              billingPeriod: issued.billingPeriod,
              issueDate: issued.issueDate,
              dueDate: issued.dueDate,
              subtotal: totals.subtotal,
              grandTotal: issued.grandTotal,
              amountPaid: 0,
              paymentStatus: status,
              overdue: isResortInvoiceOverdue(status, issued.dueDate, today),
              notes: issued.notes || null,
            };
            const current = readResortSession();
            writeResortSession({
              ...current,
              invoices: [...current.invoices.filter((item) => item.id !== row.id), row],
            });
            setNotice(`${assigned} issued for ${issued.billingPeriod}.`);
            setInvoicing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Card({ icon, label, value, badge }: { icon: ReactNode; label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xl font-semibold">{value}</p>
        {badge}
      </div>
    </div>
  );
}
