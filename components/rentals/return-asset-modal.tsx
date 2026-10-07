"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { returnAsset } from "@/actions/rental-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateRentalCharge, calendarDay } from "@/lib/engines/rental-engine";
import { formatInr } from "@/lib/money";
import type { RentalAsset } from "@/lib/rentals/types";

const conditions = ["GOOD", "Minor Damage", "Needs Repair"];

export function ReturnAssetModal({
  asset,
  onClose,
  onReturned,
}: {
  asset: RentalAsset;
  onClose: () => void;
  onReturned: (result: { condition: string; notes: string; totalRentCharged: number; returnedOn: string }) => void;
}) {
  const assignment = asset.assignment;
  const [condition, setCondition] = useState(conditions[0]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!assignment) {
    return null;
  }
  const assignmentId = assignment.id;
  const returnedOn = calendarDay();
  const charge = calculateRentalCharge(assignment.issueDate, returnedOn, assignment.dailyRateApplied);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await returnAsset(assignmentId, condition, notes);
    setBusy(false);
    if (!result.success && !result.offline) {
      setMessage(result.message);
      return;
    }
    onReturned({
      condition,
      notes,
      totalRentCharged: result.totalRentCharged ?? charge.totalRentCharged,
      returnedOn,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return {asset.assetName}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <p className="flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            {charge.daysRented} day{charge.daysRented === 1 ? "" : "s"} · {formatInr(charge.totalRentCharged)}
          </p>
          {asset.overdue ? (
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="size-4" />
              {asset.daysOverdue} day{asset.daysOverdue === 1 ? "" : "s"} overdue
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="size-4" />
              Inside the return deadline
            </p>
          )}
          <label className="space-y-1 text-sm">
            <Label>Return condition</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={condition} onChange={(event) => setCondition(event.target.value)}>
              {conditions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <Label>Return comments</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Confirm return</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
