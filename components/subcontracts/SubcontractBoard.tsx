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
import { calculateContractBalance } from "@/lib/subcontracts/balance";
import { todayIso } from "@/lib/dates";
import { useWorkspace, type PaymentMode } from "@/lib/workspace/store";

export function SubcontractBoard() {
  const workspace = useWorkspace();
  const contracts = workspace.subcontracts.filter((item) => !item.deletedAt);
  const [title, setTitle] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [leadType, setLeadType] = useState<"INTERNAL_EMPLOYEE" | "EXTERNAL_CONTRACTOR">(
    "EXTERNAL_CONTRACTOR",
  );
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [team, setTeam] = useState("");
  const [amount, setAmount] = useState("0");
  const [contractId, setContractId] = useState(contracts[0]?.id ?? "");
  const [drawAmount, setDrawAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !leadName.trim()) {
            return;
          }
          workspace.addSubcontract({
            title: title.trim(),
            projectTitle: projectTitle.trim(),
            leadPersonType: leadType,
            leadName: leadName.trim(),
            leadPhone: leadPhone.trim(),
            teamMembers: team
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean),
            totalContractAmount: Number(amount) || 0,
          });
          setTitle("");
          setLeadName("");
          setTeam("");
        }}
      >
        <Field label="Contract title">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="Project">
          <Input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} />
        </Field>
        <Field label="Lead type">
          <Select
            value={leadType}
            onValueChange={(value) => setLeadType(value as "INTERNAL_EMPLOYEE" | "EXTERNAL_CONTRACTOR")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL_EMPLOYEE">Internal employee</SelectItem>
              <SelectItem value="EXTERNAL_CONTRACTOR">External contractor</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Lead name">
          <Input value={leadName} onChange={(event) => setLeadName(event.target.value)} required />
        </Field>
        <Field label="Lead phone">
          <Input value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} />
        </Field>
        <Field label="Contract amount">
          <Input className="font-mono" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="Team members" >
          <Input
            value={team}
            placeholder="Comma-separated names"
            onChange={(event) => setTeam(event.target.value)}
          />
        </Field>
        <div className="flex items-end md:col-span-2">
          <Button type="submit" className="bg-action text-white hover:bg-action/90">
            Add subcontract
          </Button>
        </div>
      </form>

      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!contractId) {
            return;
          }
          workspace.addDraw({
            subcontractId: contractId,
            drawDate: todayIso(),
            amountPaid: Number(drawAmount) || 0,
            paymentMode,
            notes: notes.trim(),
          });
          setDrawAmount("");
          setNotes("");
        }}
      >
        <Field label="Contract">
          <Select value={contractId} onValueChange={setContractId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a contract" />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Draw amount">
          <Input className="font-mono" value={drawAmount} onChange={(event) => setDrawAmount(event.target.value)} />
        </Field>
        <Field label="Mode">
          <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UPI">UPI</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <div className="md:col-span-4">
          <Button type="submit" variant="outline">
            Record advance draw
          </Button>
        </div>
      </form>

      <ul className="space-y-3">
        {contracts.map((contract) => {
          const draws = workspace.draws.filter((draw) => draw.subcontractId === contract.id);
          const balance = calculateContractBalance(contract.totalContractAmount, draws);
          return (
            <li key={contract.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{contract.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {contract.projectTitle} · {contract.leadName}
                    {contract.leadPhone ? ` · ${contract.leadPhone}` : ""} ·{" "}
                    {contract.leadPersonType === "INTERNAL_EMPLOYEE" ? "Internal lead" : "External lead"}
                  </p>
                  <p className="mt-1 text-sm">Team: {contract.teamMembers.join(", ") || "—"}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => workspace.archiveSubcontract(contract.id)}>
                  Archive
                </Button>
              </div>
              <dl className="mt-3 grid gap-1 font-mono text-sm sm:grid-cols-3">
                <div>Contract {formatInr(contract.totalContractAmount)}</div>
                <div>Drawn {formatInr(balance.drawn)}</div>
                <div>Remaining {formatInr(balance.remaining)}</div>
              </dl>
              {draws.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {draws.map((draw) => (
                    <li key={draw.id}>
                      {draw.drawDate} · {draw.paymentMode} · {formatInr(draw.amountPaid)}
                      {draw.notes ? ` · ${draw.notes}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
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
