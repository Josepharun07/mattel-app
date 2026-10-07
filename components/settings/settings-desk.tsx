"use client";

import { useState } from "react";
import { Building2, CreditCard, FileSignature, Settings, Sliders } from "lucide-react";
import { BankDetailsForm } from "@/components/settings/bank-details-form";
import { BrandingUploader } from "@/components/settings/branding-uploader";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { InvoiceDefaultsForm } from "@/components/settings/invoice-defaults-form";
import { UnitsManager } from "@/components/settings/units-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SystemSettingsView } from "@/lib/settings/profile";
import { useWorkspace, type SessionRole } from "@/lib/workspace/store";

const tabs = [
  { id: "profile", label: "Company Profile", icon: Building2 },
  { id: "bank", label: "Bank Account Details", icon: CreditCard },
  { id: "branding", label: "Branding & Assets", icon: FileSignature },
  { id: "units", label: "Measurement Units", icon: Sliders },
  { id: "defaults", label: "Invoice Defaults", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsDesk({ initial }: { initial: SystemSettingsView }) {
  const workspace = useWorkspace();
  const [tab, setTab] = useState<TabId>("profile");
  const [settings, setSettings] = useState(initial);

  function save(patch: Partial<SystemSettingsView>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    workspace.updateSettings({
      companyName: next.companyName,
      tagline: next.tagline,
      address: next.address,
      phone: next.phone,
      email: next.email,
      gstin: next.gstin,
      bankName: next.bankName,
      accountName: next.accountName,
      accountNumber: next.accountNumber,
      ifscCode: next.ifscCode,
      upiId: next.upiId,
      defaultTerms: next.defaultTerms,
      unitTypes: next.unitTypes,
      logoDataUrl: next.logoUrl || null,
      signatureDataUrl: next.signatureUrl || null,
      defaultStationeryMode: next.defaultStationeryMode,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm ${active ? "bg-slate-900 text-white" : "bg-white"}`}
              onClick={() => setTab(item.id)}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border bg-white p-4">
        {tab === "profile" ? (
          <CompanyProfileForm
            key={settings.companyName + settings.email}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
        {tab === "bank" ? (
          <BankDetailsForm
            key={settings.accountNumber + settings.ifscCode}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
        {tab === "branding" ? (
          <BrandingUploader
            logoUrl={settings.logoUrl}
            signatureUrl={settings.signatureUrl}
            onSaved={(patch) => save(patch)}
          />
        ) : null}
        {tab === "units" ? (
          <UnitsManager unitTypes={settings.unitTypes} onSaved={(unitTypes) => save({ unitTypes })} />
        ) : null}
        {tab === "defaults" ? (
          <InvoiceDefaultsForm
            key={`${settings.defaultTerms}-${settings.defaultStationeryMode}`}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
      </section>

      {initial.offline ? (
        <p className="text-sm text-muted-foreground">PostgreSQL is not connected. Changes stay in this browser.</p>
      ) : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-medium">Session role</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Operators restore archived records. Super Admin can permanently purge them.
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
