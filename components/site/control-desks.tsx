"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPayment, reviewPayment } from "@/actions/operations-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { Panel, Rows } from "@/components/site/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInr } from "@/lib/money";
import type { AccessRole } from "@/lib/settings/appearance";
import { canApprove, type RaBill, type SiteBook } from "@/lib/site/book";

function useNotice() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  return {
    notice,
    async report(result: Promise<{ ok: boolean; message?: string }>) {
      const value = await result;
      setNotice(value.ok ? "Saved." : value.message ?? "");
      if (value.ok) router.refresh();
    },
  };
}

export function ApprovalsDesk({ book, role }: { book: SiteBook; role: AccessRole }) {
  const { notice, report } = useNotice();
  const [payment, setPayment] = useState({ payee: "", amount: "0", purpose: "", costCode: "", requestedBy: "" });

  return (
    <PageFrame eyebrow="Administration" title="Payment approvals" description="A payment stays pending until an owner or a super admin approves it.">
      <Panel title="Request">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void report(createPayment({ ...payment, amount: Number(payment.amount) })); }}>
          <Rows>
            <Input aria-label="Payee" placeholder="Payee" value={payment.payee} onChange={(event) => setPayment({ ...payment, payee: event.target.value })} />
            <Input aria-label="Amount" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} />
            <Input aria-label="Purpose" placeholder="Purpose" value={payment.purpose} onChange={(event) => setPayment({ ...payment, purpose: event.target.value })} />
            <Input aria-label="Cost code" placeholder="Cost code" value={payment.costCode} onChange={(event) => setPayment({ ...payment, costCode: event.target.value })} />
          </Rows>
          <Button type="submit">Request payment</Button>
        </form>
      </Panel>
      <ul className="space-y-3">
        {book.payments.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
            <span>{row.payee} · {formatInr(row.amount)} · {row.costCode} · {row.purpose} · {row.status}</span>
            {canApprove(role) && row.status === "PENDING" ? (
              <span className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void report(reviewPayment(row.id, "APPROVED"))}>Approve</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void report(reviewPayment(row.id, "REJECTED"))}>Reject</Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}

export function PortalHome({
  kind,
  name,
  bills,
}: {
  kind: "vendor" | "client";
  name: string;
  bills: RaBill[];
}) {
  if (kind === "vendor") {
    return (
      <PageFrame eyebrow="Vendor" title={name} description="Signed in as a vendor.">
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-muted-foreground">There is no purchase list in this workspace.</p>
      </PageFrame>
    );
  }
  return (
    <PageFrame eyebrow="Client" title={name} description="Running-account bills raised for the work.">
      <ul className="divide-y rounded-xl border bg-white text-sm">
        {bills.map((bill) => <li key={bill.id} className="px-4 py-3">{bill.billNumber} · {formatInr(bill.total)}</li>)}
        {bills.length === 0 ? <li className="px-4 py-3 text-muted-foreground">No running-account bill yet.</li> : null}
      </ul>
    </PageFrame>
  );
}
