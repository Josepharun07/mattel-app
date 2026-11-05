"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  billBoq,
  createBoqLine,
  createBudgetLine,
  createEquipmentLog,
  executeBoq,
} from "@/actions/operations-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { Panel, Rows } from "@/components/site/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInr } from "@/lib/money";
import { billedQty, boqProgress, budgetVariance, hireCost, type SiteBook } from "@/lib/site/book";

function useNotice() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  return {
    notice,
    async report(result: Promise<{ ok: boolean; message?: string }>) {
      const value = await result;
      setNotice(value.ok ? "Saved." : value.message ?? "");
      if (value.ok) {
        router.refresh();
      }
    },
  };
}

export function BoqDesk({ book }: { book: SiteBook }) {
  const { notice, report } = useNotice();
  const [line, setLine] = useState({ section: "Civil", costCode: "", description: "", unit: "sqm", contractQty: "1", rate: "0" });
  const [extra, setExtra] = useState("1");

  return (
    <PageFrame eyebrow="Site" title="Bill of quantities" description="Each line has a cost code, a contract quantity, and the quantity executed. A running-account bill covers only the quantity that has not been billed." width="wide">
      <Panel title="Add item">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void report(createBoqLine({ ...line, contractQty: Number(line.contractQty), rate: Number(line.rate) }));
          }}
        >
          <Rows>
            <Input aria-label="Cost code" placeholder="Cost code" value={line.costCode} onChange={(event) => setLine({ ...line, costCode: event.target.value })} />
            <Input aria-label="Description" placeholder="Description" value={line.description} onChange={(event) => setLine({ ...line, description: event.target.value })} />
            <Input aria-label="Contract quantity" value={line.contractQty} onChange={(event) => setLine({ ...line, contractQty: event.target.value })} />
            <Input aria-label="Rate" value={line.rate} onChange={(event) => setLine({ ...line, rate: event.target.value })} />
          </Rows>
          <Button type="submit">Add item</Button>
        </form>
      </Panel>
      <ul className="space-y-3">
        {book.boq.map((item) => (
          <li key={item.id} className="rounded-xl border bg-white p-4 text-sm">
            <p className="font-medium">{item.section} · {item.costCode} · {item.description}</p>
            <p>{item.executedQty} / {item.contractQty} {item.unit} · {boqProgress(item)}% · billed {billedQty(book, item.id)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input className="max-w-28" aria-label={`Execute ${item.costCode}`} value={extra} onChange={(event) => setExtra(event.target.value)} />
              <Button type="button" variant="outline" onClick={() => void report(executeBoq(item.id, Number(extra)))}>Record progress</Button>
              <Button type="button" onClick={() => void report(billBoq(item.id, "2026-10-23", true))}>Raise RA bill</Button>
            </div>
          </li>
        ))}
      </ul>
      {book.raBills.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-white text-sm">
          {book.raBills.map((bill) => (
            <li key={bill.id} className="px-4 py-3">{bill.billNumber} · qty {bill.quantity} · gross {formatInr(bill.total)} · retention {bill.retentionPercent}% {formatInr(bill.retentionAmount)} · payable {formatInr(bill.netPayable)}</li>
          ))}
        </ul>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}

export function EquipmentDesk({ book }: { book: SiteBook }) {
  const { notice, report } = useNotice();
  const [log, setLog] = useState({ machineName: "", ownership: "HIRED" as const, operatorName: "", siteName: "", logDate: "2026-10-23", openingReading: "0", closingReading: "0", runHours: "0", idleHours: "0", fuelLitres: "0", hireRate: "0", breakdown: "" });

  return (
    <PageFrame eyebrow="Site" title="Equipment" description="Running hours, idle hours, fuel, hire rate, and breakdown notes for owned and hired machines.">
      <Panel title="Log">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void report(createEquipmentLog({ ...log, openingReading: Number(log.openingReading), closingReading: Number(log.closingReading), runHours: Number(log.runHours), idleHours: Number(log.idleHours), fuelLitres: Number(log.fuelLitres), hireRate: Number(log.hireRate) })); }}>
          <Rows>
            <Input aria-label="Machine" placeholder="Machine" value={log.machineName} onChange={(event) => setLog({ ...log, machineName: event.target.value })} />
            <Input aria-label="Operator" placeholder="Operator" value={log.operatorName} onChange={(event) => setLog({ ...log, operatorName: event.target.value })} />
            <Input aria-label="Site" placeholder="Site" value={log.siteName} onChange={(event) => setLog({ ...log, siteName: event.target.value })} />
            <Input aria-label="Run hours" placeholder="Run hours" value={log.runHours} onChange={(event) => setLog({ ...log, runHours: event.target.value })} />
            <Input aria-label="Idle hours" placeholder="Idle hours" value={log.idleHours} onChange={(event) => setLog({ ...log, idleHours: event.target.value })} />
            <Input aria-label="Fuel litres" placeholder="Fuel litres" value={log.fuelLitres} onChange={(event) => setLog({ ...log, fuelLitres: event.target.value })} />
            <Input aria-label="Hire rate" placeholder="Hire rate per hour" value={log.hireRate} onChange={(event) => setLog({ ...log, hireRate: event.target.value })} />
            <Input aria-label="Breakdown" placeholder="Breakdown" value={log.breakdown} onChange={(event) => setLog({ ...log, breakdown: event.target.value })} />
          </Rows>
          <Button type="submit">Save log</Button>
        </form>
      </Panel>
      <ul className="divide-y rounded-xl border bg-white text-sm">
        {book.equipment.map((row) => (
          <li key={row.id} className="px-4 py-3">{row.ownership} · {row.machineName} · {row.operatorName || "No operator"} · {row.siteName} · {row.runHours}h run · {row.idleHours}h idle · {row.fuelLitres} L · hire {formatInr(hireCost(row))}{row.breakdown ? ` · ${row.breakdown}` : ""}</li>
        ))}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}

export function BudgetDesk({ book }: { book: SiteBook }) {
  const { notice, report } = useNotice();
  const [line, setLine] = useState({ costCode: "", name: "", budgetAmount: "0", committedAmount: "0", actualAmount: "0" });

  return (
    <PageFrame eyebrow="Site" title="Budget" description="Cost codes compare the budget with the amount spent. The difference is what remains.">
      <Panel title="Cost code">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void report(createBudgetLine({ ...line, budgetAmount: Number(line.budgetAmount), committedAmount: Number(line.committedAmount), actualAmount: Number(line.actualAmount) })); }}>
          <Rows>
            <Input aria-label="Cost code" placeholder="Cost code" value={line.costCode} onChange={(event) => setLine({ ...line, costCode: event.target.value })} />
            <Input aria-label="Name" placeholder="Name" value={line.name} onChange={(event) => setLine({ ...line, name: event.target.value })} />
            <Input aria-label="Budget" placeholder="Budget" value={line.budgetAmount} onChange={(event) => setLine({ ...line, budgetAmount: event.target.value })} />
            <Input aria-label="Committed" placeholder="Committed" value={line.committedAmount} onChange={(event) => setLine({ ...line, committedAmount: event.target.value })} />
            <Input aria-label="Actual" placeholder="Actual" value={line.actualAmount} onChange={(event) => setLine({ ...line, actualAmount: event.target.value })} />
          </Rows>
          <Button type="submit">Add cost code</Button>
        </form>
      </Panel>
      <ul className="divide-y rounded-xl border bg-white text-sm">
        {book.budget.map((row) => (
          <li key={row.id} className="px-4 py-3">{row.costCode} · {row.name} · budget {formatInr(row.budgetAmount)} · committed {formatInr(row.committedAmount)} · actual {formatInr(row.actualAmount)} · left {formatInr(budgetVariance(row))}</li>
        ))}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </PageFrame>
  );
}
