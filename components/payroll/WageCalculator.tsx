"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInr } from "@/lib/money";
import { calculateOvertimePay } from "@/lib/payroll/calculations";

export function WageCalculator() {
  const [workerName, setWorkerName] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("2");
  const [hourlyRate, setHourlyRate] = useState("250");
  const [status, setStatus] = useState("");

  const hours = Number(overtimeHours) || 0;
  const rate = Number(hourlyRate) || 0;
  const overtimePay = calculateOvertimePay(hours, rate);

  async function recordPayout() {
    setStatus("Saving…");
    const response = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overtimeHours: hours, hourlyRate: rate }),
    });
    const payload = (await response.json()) as { overtimePay?: number; error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Could not calculate overtime.");
      return;
    }
    setStatus(`Recorded overtime pay ${formatInr(payload.overtimePay ?? 0)}.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className="no-print space-y-4 rounded-xl border bg-white p-5">
        <div>
          <h1 className="text-xl font-semibold">Weekly overtime</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overtime pay is hours worked beyond the standard 8-hour shift, multiplied by the
            hourly rate.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="worker-name">Worker</Label>
          <Input
            id="worker-name"
            value={workerName}
            onChange={(event) => setWorkerName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="overtime-hours">Overtime hours</Label>
          <Input
            id="overtime-hours"
            inputMode="decimal"
            className="font-mono"
            value={overtimeHours}
            onChange={(event) => setOvertimeHours(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hourly-rate">Hourly rate</Label>
          <Input
            id="hourly-rate"
            inputMode="decimal"
            className="font-mono"
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" className="bg-action text-white hover:bg-action/90" onClick={recordPayout}>
            Record payout
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print slip
          </Button>
        </div>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </section>

      <article id="payout-slip" className="rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Mattel Infrastructures
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Weekly payout slip</h2>
        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Worker</dt>
            <dd>{workerName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <dt className="font-sans">Overtime hours</dt>
            <dd>{hours}</dd>
          </div>
          <div className="flex justify-between gap-4 font-mono">
            <dt className="font-sans">Hourly rate</dt>
            <dd>{formatInr(rate)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 font-mono text-base font-semibold">
            <dt className="font-sans">Overtime pay</dt>
            <dd>{formatInr(overtimePay)}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
