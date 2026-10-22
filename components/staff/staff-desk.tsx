"use client";

import { useState } from "react";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canAssignStaffRoles, roleNames, type StaffPhone, type StaffRecord } from "@/lib/staff/directory";
import { saveStaff, setStaffRoles, useStaffDirectory } from "@/lib/staff/session";
import { useWorkspace } from "@/lib/workspace/store";

function emptyDraft() {
  return {
    fullName: "",
    address: "",
    phones: [{ id: crypto.randomUUID(), label: "Mobile", number: "" }] as StaffPhone[],
    email: "",
    panNumber: "",
    aadhaarNumber: "",
    upiId: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    dailyBaseRate: 0,
    hourlyRate: 0,
    joiningDate: "",
    bloodGroup: "",
    notes: "",
  };
}

function fromRecord(person: StaffRecord) {
  return {
    ...person,
    phones: person.phones.length > 0 ? person.phones : [{ id: crypto.randomUUID(), label: "Mobile", number: "" }],
  };
}

export function StaffDesk() {
  const directory = useStaffDirectory();
  const workspace = useWorkspace();
  const allowed = canAssignStaffRoles(workspace.role);
  const people = directory.staff.filter((person) => !person.deletedAt);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  function openNew() {
    setEditingId("new");
    setDraft(emptyDraft());
    setRoleIds([]);
    setNotice("");
  }

  function openPerson(person: StaffRecord) {
    setEditingId(person.id);
    setDraft(fromRecord(person));
    setRoleIds(person.roleIds);
    setNotice("");
  }

  function toggleRole(id: string) {
    setRoleIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function save() {
    const result = saveStaff(draft, editingId === "new" ? undefined : editingId ?? undefined);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    if (allowed) {
      const assigned = setStaffRoles(result.record.id, roleIds, workspace.role);
      if (!assigned.ok) {
        setNotice(assigned.message);
        return;
      }
    }
    setEditingId(result.record.id);
    setNotice("Staff record saved.");
  }

  return (
    <PageFrame
      eyebrow="People"
      title="Staff"
      description="Name, contact, identity, bank, emergency contact, and base pay for each person. Role assignment stays with the owner and the super admin."
      width="wide"
    >
      <div className="flex justify-end">
        <Button type="button" onClick={openNew}>
          Add staff
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Daily rate</th>
              <th className="px-4 py-3 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <button type="button" className="font-medium" style={{ color: "var(--app-accent)" }} onClick={() => openPerson(person)}>
                    {person.fullName}
                  </button>
                </td>
                <td className="px-4 py-3">{roleNames(directory, person.roleIds).join(", ") || "—"}</td>
                <td className="px-4 py-3 font-mono">₹{person.dailyBaseRate.toFixed(2)}</td>
                <td className="px-4 py-3">{person.phones[0]?.number || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <form
          className="space-y-4 rounded-xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <h2 className="text-sm font-medium">{editingId === "new" ? "New staff" : "Staff record"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-name">Name</Label>
              <Input id="staff-name" value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <Label htmlFor="staff-address">Address</Label>
              <Textarea id="staff-address" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-join">Date of joining</Label>
              <Input id="staff-join" type="date" value={draft.joiningDate} onChange={(event) => setDraft({ ...draft, joiningDate: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-blood">Blood group</Label>
              <Input id="staff-blood" value={draft.bloodGroup} onChange={(event) => setDraft({ ...draft, bloodGroup: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-daily">Daily base rate</Label>
              <Input id="staff-daily" inputMode="decimal" value={String(draft.dailyBaseRate)} onChange={(event) => setDraft({ ...draft, dailyBaseRate: Number(event.target.value) })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-hourly">Hourly rate</Label>
              <Input id="staff-hourly" inputMode="decimal" value={String(draft.hourlyRate)} onChange={(event) => setDraft({ ...draft, hourlyRate: Number(event.target.value) })} />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Phone numbers</legend>
            {draft.phones.map((phone) => (
              <div key={phone.id} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                <Input
                  aria-label="Phone label"
                  value={phone.label}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      phones: draft.phones.map((item) => (item.id === phone.id ? { ...item, label: event.target.value } : item)),
                    })
                  }
                />
                <Input
                  aria-label="Phone number"
                  value={phone.number}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      phones: draft.phones.map((item) => (item.id === phone.id ? { ...item, number: event.target.value } : item)),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft({ ...draft, phones: draft.phones.filter((item) => item.id !== phone.id) })}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft({ ...draft, phones: [...draft.phones, { id: crypto.randomUUID(), label: "", number: "" }] })}
            >
              Add phone
            </Button>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-pan">PAN</Label>
              <Input id="staff-pan" value={draft.panNumber} onChange={(event) => setDraft({ ...draft, panNumber: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-aadhaar">Aadhaar</Label>
              <Input id="staff-aadhaar" value={draft.aadhaarNumber} onChange={(event) => setDraft({ ...draft, aadhaarNumber: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-upi">UPI</Label>
              <Input id="staff-upi" value={draft.upiId} onChange={(event) => setDraft({ ...draft, upiId: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-bank">Bank</Label>
              <Input id="staff-bank" value={draft.bankName} onChange={(event) => setDraft({ ...draft, bankName: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-account">Account number</Label>
              <Input id="staff-account" value={draft.accountNumber} onChange={(event) => setDraft({ ...draft, accountNumber: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-ifsc">IFSC</Label>
              <Input id="staff-ifsc" value={draft.ifscCode} onChange={(event) => setDraft({ ...draft, ifscCode: event.target.value })} />
            </label>
          </div>

          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="col-span-full text-sm font-medium">Emergency contact</legend>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-emergency-name">Name</Label>
              <Input id="staff-emergency-name" value={draft.emergencyName} onChange={(event) => setDraft({ ...draft, emergencyName: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-emergency-phone">Phone</Label>
              <Input id="staff-emergency-phone" value={draft.emergencyPhone} onChange={(event) => setDraft({ ...draft, emergencyPhone: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <Label htmlFor="staff-emergency-relation">Relation</Label>
              <Input id="staff-emergency-relation" value={draft.emergencyRelation} onChange={(event) => setDraft({ ...draft, emergencyRelation: event.target.value })} />
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Roles</legend>
            {allowed ? (
              <div className="flex flex-wrap gap-2">
                {directory.roles.map((role) => {
                  const checked = roleIds.includes(role.id);
                  return (
                    <label key={role.id} className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleRole(role.id)} />
                      {role.name}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {roleNames(directory, roleIds).join(", ") || "No roles yet."} Only an owner or a super admin can change them.
              </p>
            )}
          </fieldset>

          <label className="block space-y-1 text-sm">
            <Label htmlFor="staff-notes">Notes</Label>
            <Textarea id="staff-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit">Save staff</Button>
            {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          </div>
        </form>
      ) : null}
    </PageFrame>
  );
}
