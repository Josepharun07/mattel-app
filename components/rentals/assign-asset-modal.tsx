"use client";

import { useState, type FormEvent } from "react";
import { User, UserCheck } from "lucide-react";
import { assignAsset } from "@/actions/rental-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calendarDay, statusForBorrower, validateBorrower, type BorrowerType } from "@/lib/engines/rental-engine";
import type { RentalAsset } from "@/lib/rentals/types";

export function AssignAssetModal({
  asset,
  staff,
  projects,
  onClose,
  onIssued,
}: {
  asset: RentalAsset;
  staff: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  onClose: () => void;
  onIssued: (result: { borrowerType: BorrowerType; staffId?: string; projectId?: string; externalBorrowerName?: string; externalBorrowerPhone?: string; externalIdDetails?: string; expectedReturnDate: string; conditionOnIssue: string; dailyRateApplied: number; comments?: string }) => void;
}) {
  const [borrowerType, setBorrowerType] = useState<BorrowerType>("INTERNAL_WORKER");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idDetails, setIdDetails] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState(calendarDay());
  const [conditionOnIssue, setConditionOnIssue] = useState("GOOD");
  const [dailyRate, setDailyRate] = useState(String(asset.defaultDailyRate));
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      borrowerType,
      staffId: borrowerType === "INTERNAL_WORKER" ? staffId : undefined,
      externalBorrowerName: name,
      externalBorrowerPhone: phone,
    };
    const borrower = validateBorrower(payload);
    if (!borrower.ok) {
      setMessage(borrower.message);
      return;
    }
    setBusy(true);
    const result = await assignAsset({
      assetId: asset.id,
      borrowerType,
      staffId: payload.staffId,
      projectId: projectId || undefined,
      externalBorrowerName: borrowerType === "EXTERNAL_RENTER" ? name : undefined,
      externalBorrowerPhone: borrowerType === "EXTERNAL_RENTER" ? phone : undefined,
      externalIdDetails: idDetails || undefined,
      expectedReturnDate,
      conditionOnIssue,
      dailyRateApplied: Number(dailyRate) || 0,
      comments,
    });
    setBusy(false);
    if (!result.success && !result.offline) {
      setMessage(result.message);
      return;
    }
    onIssued({
      borrowerType,
      staffId: payload.staffId,
      projectId: projectId || undefined,
      externalBorrowerName: borrowerType === "EXTERNAL_RENTER" ? name : undefined,
      externalBorrowerPhone: borrowerType === "EXTERNAL_RENTER" ? phone : undefined,
      externalIdDetails: idDetails || undefined,
      expectedReturnDate,
      conditionOnIssue,
      dailyRateApplied: Number(dailyRate) || 0,
      comments,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue {asset.assetName}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="flex gap-2">
            <Button type="button" variant={borrowerType === "INTERNAL_WORKER" ? "default" : "outline"} onClick={() => setBorrowerType("INTERNAL_WORKER")}>
              <UserCheck />
              Internal employee
            </Button>
            <Button type="button" variant={borrowerType === "EXTERNAL_RENTER" ? "default" : "outline"} onClick={() => setBorrowerType("EXTERNAL_RENTER")}>
              <User />
              External renter
            </Button>
          </div>
          {borrowerType === "INTERNAL_WORKER" ? (
            <label className="space-y-1 text-sm">
              <Label>Worker</Label>
              <select className="h-9 w-full rounded-md border px-3 text-sm" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>{person.fullName}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <Label>Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Phone</Label>
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} required />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <Label>ID reference</Label>
                <Input value={idDetails} onChange={(event) => setIdDetails(event.target.value)} />
              </label>
            </div>
          )}
          <label className="space-y-1 text-sm">
            <Label>Project site</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">No project</option>
              {projects.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <Label>Expected return</Label>
              <Input type="date" value={expectedReturnDate} onChange={(event) => setExpectedReturnDate(event.target.value)} required />
            </label>
            <label className="space-y-1 text-sm">
              <Label>Daily rate</Label>
              <Input className="font-mono" value={dailyRate} onChange={(event) => setDailyRate(event.target.value)} />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <Label>Condition on issue</Label>
            <Input value={conditionOnIssue} onChange={(event) => setConditionOnIssue(event.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <Label>Comments</Label>
            <Input value={comments} onChange={(event) => setComments(event.target.value)} />
          </label>
          {message ? <p className="text-sm text-amber-800">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Issue {statusForBorrower(borrowerType) === "RENTED_INTERNAL" ? "internally" : "externally"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
