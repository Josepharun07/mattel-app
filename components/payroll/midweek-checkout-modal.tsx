"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateRangePayroll } from "@/lib/engines/payroll-engine";
import { formatInr } from "@/lib/money";
import type { AttendanceCell, StaffMember } from "@/lib/payroll/types";

export function MidweekCheckoutModal({
  staff,
  attendance,
  defaultStart,
  defaultEnd,
  busy,
  onClose,
  onConfirm,
}: {
  staff: StaffMember;
  attendance: AttendanceCell[];
  defaultStart: string;
  defaultEnd: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string, notes: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const logs = attendance.filter((row) => row.staffId === staff.id);
  const preview =
    startDate <= endDate
      ? calculateRangePayroll(staff.dailyBaseRate, staff.hourlyRate, logs, startDate, endDate)
      : null;
  const payable = Boolean(preview && (preview.daysPresent > 0 || preview.totalOvertimeHours > 0));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await onConfirm(startDate, endDate, notes);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mid-week checkout · {staff.fullName}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <Label>Start</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </label>
            <label className="space-y-1 text-sm">
              <Label>End</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional payout note" />
          </label>
          {preview && payable ? (
            <div className="rounded-lg border bg-slate-50 px-3 py-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <DollarSign className="size-4" />
                {formatInr(preview.grossPayable)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {preview.daysPresent} present day{preview.daysPresent === 1 ? "" : "s"} · {preview.totalOvertimeHours} OT
                hours · base {formatInr(preview.basePay)} · overtime {formatInr(preview.overtimePay)}
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="size-4" />
              {startDate > endDate ? "The start date must be on or before the end date." : "No payable attendance in that range."}
            </p>
          )}
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !payable}>
              Confirm checkout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
