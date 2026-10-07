"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInr } from "@/lib/money";
import { calculateShiftPay, calculateWeeklyPay } from "@/lib/payroll/calculations";
import { todayIso } from "@/lib/dates";
import { useWorkspace, type AttendanceMark } from "@/lib/workspace/store";

export function AttendanceBoard() {
  const workspace = useWorkspace();
  const [workerId, setWorkerId] = useState(workspace.workers[0]?.id ?? "");
  const [workerName, setWorkerName] = useState("");
  const [dailyRate, setDailyRate] = useState("800");
  const [hourlyRate, setHourlyRate] = useState("100");
  const [workDate, setWorkDate] = useState(todayIso());
  const [mark, setMark] = useState<AttendanceMark>("FULL");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [status, setStatus] = useState("");

  const worker = workspace.workers.find((item) => item.id === workerId) ?? workspace.workers[0];
  const week = worker
    ? workspace.attendance
        .filter((row) => row.workerId === worker.id)
        .sort((a, b) => a.workDate.localeCompare(b.workDate))
    : [];
  const weekly = calculateWeeklyPay(
    week.map((row) => ({
      mark: row.mark,
      dailyRate: worker?.dailyRate ?? 0,
      overtimeHours: row.overtimeHours,
      hourlyRate: worker?.hourlyRate ?? 0,
    })),
  );

  async function recordWeek() {
    setStatus("Saving…");
    const response = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overtimeHours: weekly.overtimePay === 0 ? 0 : week.reduce((sum, row) => sum + row.overtimeHours, 0),
        hourlyRate: worker?.hourlyRate ?? 0,
      }),
    });
    const payload = (await response.json()) as { overtimePay?: number; error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Could not record overtime.");
      return;
    }
    setStatus(`Recorded overtime ${formatInr(payload.overtimePay ?? 0)}. Week total ${formatInr(weekly.total)}.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <div className="no-print space-y-4">
        <form
          className="space-y-3 rounded-xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!workerName.trim()) {
              return;
            }
            workspace.addWorker({
              name: workerName.trim(),
              dailyRate: Number(dailyRate) || 0,
              hourlyRate: Number(hourlyRate) || 0,
            });
            setWorkerName("");
          }}
        >
          <h2 className="font-medium">Add worker</h2>
          <Field label="Name">
            <Input value={workerName} onChange={(event) => setWorkerName(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily rate">
              <Input className="font-mono" value={dailyRate} onChange={(event) => setDailyRate(event.target.value)} />
            </Field>
            <Field label="Hourly rate">
              <Input className="font-mono" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
            </Field>
          </div>
          <Button type="submit" variant="outline">
            Save worker
          </Button>
        </form>

        <form
          className="space-y-3 rounded-xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!worker) {
              return;
            }
            workspace.saveAttendance({
              workerId: worker.id,
              workDate,
              mark,
              overtimeHours: Number(overtimeHours) || 0,
            });
          }}
        >
          <h2 className="font-medium">Daily attendance</h2>
          <p className="text-sm text-muted-foreground">
            Full day covers the standard 8–9 hour shift. Half day is half the daily rate. Overtime is
            extra hours times the hourly rate.
          </p>
          <Field label="Worker">
            <Select value={worker?.id} onValueChange={setWorkerId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspace.workers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} />
          </Field>
          <Field label="Mark">
            <Select value={mark} onValueChange={(value) => setMark(value as AttendanceMark)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Full day</SelectItem>
                <SelectItem value="HALF">Half day</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Overtime hours">
            <Input
              className="font-mono"
              value={overtimeHours}
              onChange={(event) => setOvertimeHours(event.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="bg-action text-white hover:bg-action/90">
              Save day
            </Button>
            <Button type="button" variant="outline" onClick={recordWeek}>
              Record week
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Print slip
            </Button>
          </div>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </form>
      </div>

      <article id="payout-slip" className="rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Mattel Infrastructures</p>
        <h2 className="mt-2 text-2xl font-semibold">Weekly payout slip</h2>
        <p className="mt-1 text-sm">{worker?.name ?? "No worker"}</p>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Mark</th>
              <th className="py-2 text-right font-medium">Overtime</th>
              <th className="py-2 text-right font-medium">Pay</th>
            </tr>
          </thead>
          <tbody>
            {week.map((row) => {
              const pay = calculateShiftPay(
                row.mark,
                worker?.dailyRate ?? 0,
                row.overtimeHours,
                worker?.hourlyRate ?? 0,
              );
              return (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.workDate}</td>
                  <td className="py-2">{row.mark === "FULL" ? "Full day" : row.mark === "HALF" ? "Half day" : "Absent"}</td>
                  <td className="py-2 text-right font-mono">{row.overtimeHours}</td>
                  <td className="py-2 text-right font-mono">{formatInr(pay.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="mt-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <dt className="font-sans">Base pay</dt>
            <dd>{formatInr(weekly.basePay)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-sans">Overtime</dt>
            <dd>{formatInr(weekly.overtimePay)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt className="font-sans">Week total</dt>
            <dd>{formatInr(weekly.total)}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
