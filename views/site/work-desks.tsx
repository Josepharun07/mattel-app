"use client";

import { useRouter } from "next/navigation";
import { usePageState } from "@/lib/navigation/page-memory";
import { createEquipmentLog } from "@/controllers/operations";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { Panel, Rows } from "@/views/site/panel";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { formatInr } from "@/lib/money";
import { hireCost, type SiteBook } from "@/lib/site/book";

function useNotice() {
  const router = useRouter();
  const confirm = useConfirm();
  const [notice, setNotice] = usePageState("notice", "");
  return {
    notice,
    async report(run: () => Promise<{ ok: boolean; message?: string }>, ask: { title: string; detail: string }) {
      const accepted = await confirm(ask);
      if (!accepted) return;
      const value = await run();
      setNotice(value.ok ? "Saved." : value.message ?? "");
      if (value.ok) {
        router.refresh();
      }
    },
  };
}

export function EquipmentDesk({ book }: { book: SiteBook }) {
  const { notice, report } = useNotice();
  const [log, setLog] = usePageState("log", { machineName: "", ownership: "HIRED" as const, operatorName: "", siteName: "", logDate: "2026-10-23", openingReading: "0", closingReading: "0", runHours: "0", idleHours: "0", fuelLitres: "0", hireRate: "0", breakdown: "" });

  return (
    <PageFrame eyebrow="Site" title="Equipment" description="Running hours, idle hours, fuel, hire rate, and breakdown notes for owned and hired machines.">
      <Panel title="Log">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void report(() => createEquipmentLog({ ...log, openingReading: Number(log.openingReading), closingReading: Number(log.closingReading), runHours: Number(log.runHours), idleHours: Number(log.idleHours), fuelLitres: Number(log.fuelLitres), hireRate: Number(log.hireRate) }), { title: "Save this equipment log?", detail: "This records the readings, hours, and hire for the day." }); }}>
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
