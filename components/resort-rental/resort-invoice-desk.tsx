"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { RecordPaymentModal } from "@/components/resort-rental/record-payment-modal";
import { ResortInvoiceTable } from "@/components/resort-rental/resort-invoice-table";
import { Button } from "@/components/ui/button";
import { isResortInvoiceOverdue, resortPaymentStatus } from "@/lib/engines/resort-engine";
import { roundMoney } from "@/lib/money";
import { readResortSession, serverResortSession, subscribeResortSession, writeResortSession } from "@/lib/resort/session";
import type { ResortDirectory, ResortInvoice, ResortPayment } from "@/lib/resort/types";

function mergeById<T extends { id: string }>(base: T[], extra: T[]) {
  const map = new Map(base.map((row) => [row.id, row]));
  for (const row of extra) map.set(row.id, row);
  return [...map.values()];
}

export function ResortInvoiceDesk({ initial }: { initial: ResortDirectory }) {
  const session = useSyncExternalStore(subscribeResortSession, readResortSession, serverResortSession);
  const [filter, setFilter] = useState<"ALL" | "UNPAID" | "OVERDUE">("ALL");
  const [collecting, setCollecting] = useState<ResortInvoice | null>(null);
  const [notice, setNotice] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const invoices = mergeById(initial.invoices, session.invoices);
  const rows = invoices.filter((row) => {
    if (filter === "OVERDUE") return row.overdue;
    if (filter === "UNPAID") return row.paymentStatus !== "PAID";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["ALL", "UNPAID", "OVERDUE"] as const).map((item) => (
          <Button key={item} type="button" size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item === "ALL" ? "All" : item === "UNPAID" ? "Open" : "Overdue"}
          </Button>
        ))}
      </div>
      <ResortInvoiceTable invoices={rows} onCollect={setCollecting} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      <Button variant="outline" asChild>
        <Link href="/resort-rental">Back to leases</Link>
      </Button>
      {collecting ? (
        <RecordPaymentModal
          invoice={collecting}
          onClose={() => setCollecting(null)}
          onRecorded={(recorded) => {
            const amountPaid = roundMoney(collecting.amountPaid + recorded.amountPaid);
            const paymentStatus = resortPaymentStatus(collecting.grandTotal, amountPaid);
            const nextInvoice: ResortInvoice = {
              ...collecting,
              amountPaid,
              paymentStatus,
              overdue: isResortInvoiceOverdue(paymentStatus, collecting.dueDate, today),
            };
            const payment: ResortPayment = {
              id: crypto.randomUUID(),
              invoiceId: collecting.id,
              paymentDate: today,
              amountPaid: recorded.amountPaid,
              paymentMode: recorded.paymentMode,
              referenceNumber: recorded.referenceNumber || null,
              notes: recorded.notes || null,
            };
            const current = readResortSession();
            writeResortSession({
              ...current,
              invoices: [...current.invoices.filter((row) => row.id !== nextInvoice.id), nextInvoice],
              payments: [...current.payments, payment],
            });
            setNotice(`${collecting.invoiceNumber} is now ${paymentStatus === "PAID" ? "paid" : paymentStatus === "PARTIALLY_PAID" ? "partially paid" : "unpaid"}.`);
            setCollecting(null);
          }}
        />
      ) : null}
    </div>
  );
}
