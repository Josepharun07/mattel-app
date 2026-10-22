"use client";

import { useState } from "react";
import { Building2, CreditCard, FileSignature, Palette, Settings, Sliders } from "lucide-react";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { BankDetailsForm } from "@/components/settings/bank-details-form";
import { BrandingUploader } from "@/components/settings/branding-uploader";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { InvoiceDefaultsForm } from "@/components/settings/invoice-defaults-form";
import { UnitsManager } from "@/components/settings/units-manager";
import type { SystemSettingsView } from "@/lib/settings/profile";
import { useWorkspace } from "@/lib/workspace/store";

const tabs = [
  { id: "profile", label: "Company Profile", icon: Building2 },
  { id: "bank", label: "Bank Account Details", icon: CreditCard },
  { id: "branding", label: "Branding & Assets", icon: FileSignature },
  { id: "units", label: "Measurement Units", icon: Sliders },
  { id: "defaults", label: "Invoice Defaults", icon: Settings },
  { id: "appearance", label: "App Settings", icon: Palette },
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
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm ${active ? "text-white" : "bg-white"}`}
              style={active ? { backgroundColor: "var(--app-accent)" } : undefined}
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
        {tab === "appearance" ? <AppearancePanel /> : null}
      </section>

      {initial.offline ? (
        <p className="text-sm text-muted-foreground">PostgreSQL is not connected. Changes stay in this browser.</p>
      ) : null}
    </div>
  );
}
