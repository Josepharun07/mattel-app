"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { requestProfileUpdate, reviewProfileUpdate } from "@/controllers/account-controls";
import { saveStaffAction } from "@/controllers/staff";
import { allPageGrants, employeeRoles, employeeRoleLabel, isEmployeeRole, officePages, roleHasFullOffice, settingsPages, type EmployeeRole } from "@/lib/auth/pages";
import { PageFrame } from "@/views/shell/page-frame";
import { useConfirm } from "@/views/shell/confirm";
import { useToast } from "@/views/shell/toast";
import { Button } from "@/views/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/views/ui/card";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { Switch } from "@/views/ui/switch";
import { Textarea } from "@/views/ui/textarea";
import { PasswordReset } from "@/views/staff/password-reset";
import { RecordActions } from "@/views/shell/record-actions";
import type { AccessRole } from "@/lib/settings/appearance";
import type { StaffDirectory, StaffPhone, StaffRecord } from "@/lib/staff/directory";

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

export function StaffEditor({
  person,
  canEdit = false,
  requestMode = false,
  admin = false,
  pending,
}: {
  directory: StaffDirectory;
  role: AccessRole;
  person?: StaffRecord;
  canEdit?: boolean;
  requestMode?: boolean;
  admin?: boolean;
  pending?: { id: string; fullName: string; email: string; address: string } | null;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const creating = !person;
  const [editing, setEditing] = useState(creating && canEdit);
  const [inform, setInform] = useState(false);
  const [draft, setDraft] = useState(person ? fromRecord(person) : emptyDraft);
  const [accountRole, setAccountRole] = useState<EmployeeRole>(isEmployeeRole(person?.accountRole ?? "") ? (person?.accountRole as EmployeeRole) : "STAFF");
  const [pageAccess, setPageAccess] = useState<string[]>(person?.pageAccess ?? []);
  const fullOffice = roleHasFullOffice(accountRole);

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft({ ...draft, [key]: value });
  }

  async function save() {
    const accepted = await confirm({ title: creating ? "Save this employee?" : "Save these employee changes?", detail: creating && inform ? "This saves the person and sends the onboarding email when an address is present." : "This writes the employee record." });
    if (!accepted) return;
    if (requestMode && person) {
      const requested = await requestProfileUpdate(person.id, { ...draft, accountRole, pageAccess });
      toast(requested.message, requested.ok);
      if (requested.ok) setEditing(false);
      return;
    }
    const result = await saveStaffAction({ ...draft, accountRole, pageAccess: fullOffice ? [...allPageGrants] : pageAccess }, person?.id, creating && inform);
    if (!result.ok) {
      toast(result.message, false);
      return;
    }
    toast(result.message, true);
    setEditing(false);
    router.push(`/staff/${result.record.id}`);
    router.refresh();
  }

  async function review(decision: "APPROVED" | "REJECTED") {
    if (!pending) return;
    const accepted = await confirm({
      title: decision === "APPROVED" ? "Approve this profile update?" : "Decline this profile update?",
      detail: decision === "APPROVED" ? "The employee record is updated from the request." : "The current record stays as it is.",
    });
    if (!accepted) return;
    const result = await reviewProfileUpdate(pending.id, decision);
    toast(result.message, result.ok);
    if (result.ok) router.refresh();
  }

  return (
    <PageFrame
      eyebrow="People"
      title={creating ? "New employee" : draft.fullName || "Employee profile"}
      description={creating ? "Create the employee record. Inform employee sends an onboarding email when an email address is present." : employeeRoleLabel(accountRole)}
      width="wide"
      action={
        <div className="flex max-w-xl flex-wrap items-center justify-end gap-2">
          {!creating && canEdit && !editing ? (
            <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
          ) : null}
          {person && admin ? (
            <>
              <RecordActions kind="employee" id={person.id} active={person.active !== false} label={person.fullName} />
              <PasswordReset staffId={person.id} />
            </>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Personal information">
          <Line label="Full name" value={draft.fullName} editing={editing} onChange={(value) => set("fullName", value)} />
          <Line label="Blood group" value={draft.bloodGroup} editing={editing} onChange={(value) => set("bloodGroup", value)} />
          <Line label="PAN" value={draft.panNumber} editing={editing} onChange={(value) => set("panNumber", value)} />
          <Line label="Aadhaar" value={draft.aadhaarNumber} editing={editing} onChange={(value) => set("aadhaarNumber", value)} />
        </Section>
        <Section title="Contact">
          <Line label="Email" value={draft.email} editing={editing} onChange={(value) => set("email", value)} />
          <Line label="Phone" value={draft.phones[0]?.number ?? ""} editing={editing} onChange={(value) => set("phones", [{ ...draft.phones[0], id: draft.phones[0]?.id ?? crypto.randomUUID(), label: "Mobile", number: value }])} />
          <Line label="Address" value={draft.address} editing={editing} onChange={(value) => set("address", value)} />
        </Section>
        <Section title="Employment">
          <Line label="Joining date" value={draft.joiningDate} editing={editing} onChange={(value) => set("joiningDate", value)} type="date" />
          <Line label="Daily rate" value={String(draft.dailyBaseRate)} editing={editing} onChange={(value) => set("dailyBaseRate", Number(value) || 0)} />
          <Line label="Hourly rate" value={String(draft.hourlyRate)} editing={editing} onChange={(value) => set("hourlyRate", Number(value) || 0)} />
          <div className="py-2">
            <p className="text-xs text-muted-foreground">Role</p>
            {editing && !requestMode ? (
              <select
                aria-label="Role"
                className="mt-2 h-9 w-full rounded-md border bg-white px-3 text-sm"
                value={accountRole}
                onChange={(event) => setAccountRole(isEmployeeRole(event.target.value) ? event.target.value : "STAFF")}
              >
                {employeeRoles.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm">{employeeRoleLabel(accountRole)}</p>
            )}
          </div>
        </Section>
        <Section title="Bank and emergency">
          <Line label="Bank" value={draft.bankName} editing={editing} onChange={(value) => set("bankName", value)} />
          <Line label="Account" value={draft.accountNumber} editing={editing} onChange={(value) => set("accountNumber", value)} />
          <Line label="IFSC" value={draft.ifscCode} editing={editing} onChange={(value) => set("ifscCode", value)} />
          <Line label="UPI" value={draft.upiId} editing={editing} onChange={(value) => set("upiId", value)} />
          <Line label="Emergency name" value={draft.emergencyName} editing={editing} onChange={(value) => set("emergencyName", value)} />
          <Line label="Emergency phone" value={draft.emergencyPhone} editing={editing} onChange={(value) => set("emergencyPhone", value)} />
          <Line label="Relation" value={draft.emergencyRelation} editing={editing} onChange={(value) => set("emergencyRelation", value)} />
        </Section>
      </div>
      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          {editing ? <Textarea aria-label="Notes" value={draft.notes} onChange={(event) => set("notes", event.target.value)} /> : <p className="text-sm">{draft.notes || "—"}</p>}
        </CardContent>
      </Card>
      {requestMode ? null : (
      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {fullOffice ? "An owner or super user can open every page." : "Turn on the pages this person sees after they sign in."}
          </p>
          {["Work", "People", "Administration", "System"].map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs text-muted-foreground">{group}</p>
              {officePages.filter((page) => page.group === group).map((page) => (
                <label key={page.id} className="flex items-center justify-between gap-3 text-sm">
                  {page.label}
                  <Switch
                    checked={fullOffice || pageAccess.includes(page.id)}
                    disabled={!editing || fullOffice}
                    onCheckedChange={(checked) => setPageAccess((current) => checked ? [...current, page.id] : current.filter((item) => item !== page.id))}
                  />
                </label>
              ))}
            </div>
          ))}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Settings</p>
            {settingsPages.map((page) => (
              <label key={page.id} className="flex items-center justify-between gap-3 text-sm">
                {page.label}
                <Switch
                  checked={fullOffice || pageAccess.includes(page.id)}
                  disabled={!editing || fullOffice}
                  onCheckedChange={(checked) => setPageAccess((current) => checked ? [...current, page.id] : current.filter((item) => item !== page.id))}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
      {pending && admin ? (
        <Card>
          <CardHeader><CardTitle>Waiting for approval</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{pending.fullName} · {pending.email || "No email"} · {pending.address || "No address"}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void review("APPROVED")}>Approve</Button>
              <Button type="button" variant="outline" onClick={() => void review("REJECTED")}>Decline</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {editing ? (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" onClick={() => void save()}>{requestMode ? "Request update" : "Save"}</Button>
          {creating ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border" checked={inform} onChange={(event) => setInform(event.target.checked)} />
              Inform employee
            </label>
          ) : null}
        </div>
      ) : null}
    </PageFrame>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

function Line({
  label,
  value,
  editing,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[9rem_1fr] sm:items-center">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? <Input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} /> : <p className="text-sm">{value || "—"}</p>}
    </div>
  );
}
