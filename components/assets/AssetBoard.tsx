"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shell/StatusBadge";
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
import { isReturnOverdue } from "@/lib/assets/returns";
import { todayIso } from "@/lib/dates";
import { useWorkspace } from "@/lib/workspace/store";

export function AssetBoard() {
  const workspace = useWorkspace();
  const today = todayIso();
  const assets = workspace.assets.filter((asset) => !asset.deletedAt);
  const [assetName, setAssetName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [assigneeType, setAssigneeType] = useState<"INTERNAL_EMPLOYEE" | "EXTERNAL_RENTER">(
    "EXTERNAL_RENTER",
  );
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [idDetails, setIdDetails] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState(today);

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!assetName.trim()) {
            return;
          }
          workspace.addAsset({ assetName: assetName.trim(), assetCode: assetCode.trim() });
          setAssetName("");
          setAssetCode("");
        }}
      >
        <Field label="Asset name">
          <Input value={assetName} onChange={(event) => setAssetName(event.target.value)} required />
        </Field>
        <Field label="Asset code">
          <Input value={assetCode} onChange={(event) => setAssetCode(event.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" className="bg-action text-white hover:bg-action/90">
            Add asset
          </Button>
        </div>
      </form>

      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!assetId || !personName.trim() || !expectedReturnDate) {
            return;
          }
          workspace.addAssignment({
            assetId,
            assigneeType,
            employeeName: assigneeType === "INTERNAL_EMPLOYEE" ? personName.trim() : "",
            externalName: assigneeType === "EXTERNAL_RENTER" ? personName.trim() : "",
            externalPhone: phone.trim(),
            externalIdDetails: idDetails.trim(),
            issueDate: today,
            expectedReturnDate,
          });
          setPersonName("");
          setPhone("");
          setIdDetails("");
        }}
      >
        <Field label="Asset">
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.assetName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Borrower type">
          <Select
            value={assigneeType}
            onValueChange={(value) => setAssigneeType(value as "INTERNAL_EMPLOYEE" | "EXTERNAL_RENTER")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL_EMPLOYEE">Internal employee</SelectItem>
              <SelectItem value="EXTERNAL_RENTER">External renter</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Name">
          <Input value={personName} onChange={(event) => setPersonName(event.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="ID details">
          <Input value={idDetails} onChange={(event) => setIdDetails(event.target.value)} />
        </Field>
        <Field label="Expected return">
          <Input
            type="date"
            value={expectedReturnDate}
            onChange={(event) => setExpectedReturnDate(event.target.value)}
          />
        </Field>
        <div className="md:col-span-3">
          <Button type="submit" variant="outline">
            Issue asset
          </Button>
        </div>
      </form>

      <ul className="space-y-3">
        {assets.map((asset) => {
          const openAssignments = workspace.assignments.filter(
            (assignment) => assignment.assetId === asset.id && !assignment.actualReturnDate,
          );
          return (
            <li key={asset.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {asset.assetName}{" "}
                    <span className="font-mono text-sm text-muted-foreground">{asset.assetCode}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{asset.status}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => workspace.archiveAsset(asset.id)}>
                  Archive
                </Button>
              </div>
              <ul className="mt-3 space-y-2">
                {openAssignments.map((assignment) => {
                  const overdue = isReturnOverdue(
                    assignment.expectedReturnDate,
                    assignment.actualReturnDate,
                    today,
                  );
                  const name =
                    assignment.assigneeType === "INTERNAL_EMPLOYEE"
                      ? assignment.employeeName
                      : assignment.externalName;
                  return (
                    <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        {name}
                        {assignment.externalPhone ? ` · ${assignment.externalPhone}` : ""}
                        {assignment.externalIdDetails ? ` · ${assignment.externalIdDetails}` : ""}
                        {" · due "}
                        {assignment.expectedReturnDate}
                      </span>
                      <span className="flex items-center gap-2">
                        {overdue ? <StatusBadge tone="warn">Overdue</StatusBadge> : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => workspace.returnAsset(assignment.id, today)}
                        >
                          Mark returned
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
