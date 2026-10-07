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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace, type SessionRole } from "@/lib/workspace/store";

export function SettingsForm() {
  const workspace = useWorkspace();
  const settings = workspace.settings;
  const [unitName, setUnitName] = useState("");

  function readImage(file: File | undefined, key: "logoDataUrl" | "signatureDataUrl") {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        workspace.updateSettings({ [key]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-medium">Company profile</h2>
        <Field label="Company name">
          <Input
            value={settings.companyName}
            onChange={(event) => workspace.updateSettings({ companyName: event.target.value })}
          />
        </Field>
        <Field label="Tagline">
          <Input
            value={settings.tagline}
            onChange={(event) => workspace.updateSettings({ tagline: event.target.value })}
          />
        </Field>
        <Field label="Address" className="md:col-span-2">
          <Textarea
            value={settings.address}
            onChange={(event) => workspace.updateSettings({ address: event.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input value={settings.phone} onChange={(event) => workspace.updateSettings({ phone: event.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={settings.email} onChange={(event) => workspace.updateSettings({ email: event.target.value })} />
        </Field>
        <Field label="GSTIN">
          <Input value={settings.gstin} onChange={(event) => workspace.updateSettings({ gstin: event.target.value })} />
        </Field>
        <Field label="Manager designation">
          <Input
            value={settings.managerDesignation}
            onChange={(event) => workspace.updateSettings({ managerDesignation: event.target.value })}
          />
        </Field>
        <Field label="Default terms" className="md:col-span-2">
          <Textarea
            value={settings.defaultTerms}
            onChange={(event) => workspace.updateSettings({ defaultTerms: event.target.value })}
          />
        </Field>
      </section>

      <section className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-medium">Operating account</h2>
        <Field label="Bank entity" className="md:col-span-2">
          <Input
            value={settings.bankName}
            onChange={(event) => workspace.updateSettings({ bankName: event.target.value })}
          />
        </Field>
        <Field label="Account number">
          <Input
            value={settings.accountNumber}
            onChange={(event) => workspace.updateSettings({ accountNumber: event.target.value })}
          />
        </Field>
        <Field label="IFSC">
          <Input
            value={settings.ifscCode}
            onChange={(event) => workspace.updateSettings({ ifscCode: event.target.value })}
          />
        </Field>
        <Field label="UPI">
          <Input value={settings.upiId} onChange={(event) => workspace.updateSettings({ upiId: event.target.value })} />
        </Field>
      </section>

      <section className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-medium">Logo and signature</h2>
        <Field label="Logo">
          <Input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0], "logoDataUrl")} />
        </Field>
        <Field label="Signature stamp (PNG)">
          <Input
            type="file"
            accept="image/png,image/*"
            onChange={(event) => readImage(event.target.files?.[0], "signatureDataUrl")}
          />
        </Field>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-medium">Measurement units</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {settings.unitTypes.map((unit) => (
            <li key={unit}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  workspace.updateSettings({
                    unitTypes: settings.unitTypes.filter((item) => item !== unit),
                  })
                }
              >
                {unit} ×
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = unitName.trim();
            if (!next || settings.unitTypes.includes(next)) {
              return;
            }
            workspace.updateSettings({ unitTypes: [...settings.unitTypes, next] });
            setUnitName("");
          }}
        >
          <Input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="New unit" />
          <Button type="submit" variant="outline">
            Add unit
          </Button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-medium">Session role</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Operators restore archived records. Super Admin can permanently purge them. This switch
          stands in until sign-in exists.
        </p>
        <div className="mt-3 max-w-xs">
          <Select value={workspace.role} onValueChange={(value) => workspace.setRole(value as SessionRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERATOR">Operator</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
