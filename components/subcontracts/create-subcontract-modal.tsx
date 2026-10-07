"use client";

import { useState, type FormEvent } from "react";
import { ShieldAlert, User, UserCheck } from "lucide-react";
import { createSubcontract } from "@/actions/subcontract-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateLead, type LeadPersonType } from "@/lib/engines/subcontract-engine";
import type { TeamMember } from "@/lib/subcontracts/types";

export function CreateSubcontractModal({
  staff,
  projects,
  onClose,
  onCreated,
}: {
  staff: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (result: {
    projectId: string;
    title: string;
    leadPersonType: LeadPersonType;
    leadStaffId?: string;
    leadName: string;
    leadPhone?: string;
    teamMembers: TeamMember[];
    totalContractAmount: number;
  }) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [leadPersonType, setLeadPersonType] = useState<LeadPersonType>("INTERNAL_WORKER");
  const [leadStaffId, setLeadStaffId] = useState(staff[0]?.id ?? "");
  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleTeam(id: string) {
    setSelectedTeam((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const leadName = leadPersonType === "INTERNAL_WORKER"
      ? staff.find((person) => person.id === leadStaffId)?.fullName ?? ""
      : externalName.trim();
    const teamMembers: TeamMember[] = [
      ...selectedTeam
        .filter((id) => id !== leadStaffId)
        .map((id) => ({ staffId: id, name: staff.find((person) => person.id === id)?.fullName ?? id })),
      ...extras.map((name) => ({ staffId: null, name })),
    ];
    const payload = {
      projectId,
      title: title.trim(),
      leadPersonType,
      leadStaffId: leadPersonType === "INTERNAL_WORKER" ? leadStaffId : undefined,
      externalLeadName: leadPersonType === "EXTERNAL_CONTRACTOR" ? externalName.trim() : undefined,
      externalLeadPhone: leadPersonType === "EXTERNAL_CONTRACTOR" ? externalPhone.trim() : undefined,
      teamMembers,
      totalContractAmount: Number(amount),
    };
    const lead = validateLead(payload);
    if (!projectId || !payload.title || !lead.ok || !Number.isFinite(payload.totalContractAmount) || payload.totalContractAmount <= 0) {
      setMessage(lead.ok ? "Enter the project, title, and contract amount." : lead.message);
      return;
    }
    setBusy(true);
    const result = await createSubcontract(payload);
    setBusy(false);
    if (!result.success && !result.offline) {
      setMessage(result.message);
      return;
    }
    onCreated({ ...payload, leadName, leadPhone: payload.externalLeadPhone });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New subcontract</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <label className="space-y-1 text-sm">
            <Label>Project</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <Label>Contract title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <Label>Total amount</Label>
            <Input className="font-mono" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant={leadPersonType === "INTERNAL_WORKER" ? "default" : "outline"} onClick={() => setLeadPersonType("INTERNAL_WORKER")}>
              <UserCheck />
              Internal lead
            </Button>
            <Button type="button" variant={leadPersonType === "EXTERNAL_CONTRACTOR" ? "default" : "outline"} onClick={() => setLeadPersonType("EXTERNAL_CONTRACTOR")}>
              <User />
              External contractor
            </Button>
          </div>
          {leadPersonType === "INTERNAL_WORKER" ? (
            <label className="space-y-1 text-sm">
              <Label>Team lead</Label>
              <select className="h-9 w-full rounded-md border px-3 text-sm" value={leadStaffId} onChange={(event) => setLeadStaffId(event.target.value)}>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>{person.fullName}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <Label>Name</Label>
                <Input value={externalName} onChange={(event) => setExternalName(event.target.value)} required />
              </label>
              <label className="space-y-1 text-sm">
                <Label>Phone</Label>
                <Input value={externalPhone} onChange={(event) => setExternalPhone(event.target.value)} required />
              </label>
            </div>
          )}
          <fieldset className="space-y-2 text-sm">
            <legend className="text-sm font-medium">Team members</legend>
            {staff.map((person) => (
              <label key={person.id} className="flex items-center gap-2">
                <input type="checkbox" checked={selectedTeam.includes(person.id)} onChange={() => toggleTeam(person.id)} />
                {person.fullName}
              </label>
            ))}
            <div className="flex gap-2">
              <Input value={extraName} placeholder="Add a worker name" onChange={(event) => setExtraName(event.target.value)} />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const name = extraName.trim();
                  if (!name) return;
                  setExtras((current) => [...current, name]);
                  setExtraName("");
                }}
              >
                Add
              </Button>
            </div>
            {extras.length > 0 ? <p className="text-muted-foreground">{extras.join(", ")}</p> : null}
          </fieldset>
          {message ? (
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <ShieldAlert className="size-4" />
              {message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Create contract</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
