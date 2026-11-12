"use client";

import { useState } from "react";
import type { DatabaseStatus } from "@/controllers/database";
import { Card, CardContent } from "@/views/ui/card";
import { useSettingsSection } from "@/views/settings/settings-rail";
import { AppearancePanel } from "@/views/settings/appearance-panel";
import { DatabasePanel } from "@/views/settings/database-panel";
import { BankDetailsForm } from "@/views/settings/bank-details-form";
import { BrandingUploader } from "@/views/settings/branding-uploader";
import { CompanyProfileForm } from "@/views/settings/company-profile-form";
import { InvoiceDefaultsForm } from "@/views/settings/invoice-defaults-form";
import { UnitsManager } from "@/views/settings/units-manager";
import type { SystemSettingsView } from "@/lib/settings/profile";
import { useWorkspace } from "@/lib/workspace/store";

const sectionIds = ["profile", "bank", "branding", "units", "defaults", "appearance", "database"] as const;

export function SettingsDesk({
  initial,
  database,
  pages,
}: {
  initial: SystemSettingsView;
  database: DatabaseStatus;
  pages: "all" | string[];
}) {
  const workspace = useWorkspace();
  const { section } = useSettingsSection();
  const [settings, setSettings] = useState(initial);
  const visible = sectionIds.filter((id) => pages === "all" || pages.includes(`settings.${id}`));
  const currentTab = visible.includes(section) ? section : visible[0];

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
      <Card>
        <CardContent className="pt-4">
        {currentTab === "profile" ? (
          <CompanyProfileForm
            key={settings.companyName + settings.email}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
        {currentTab === "bank" ? (
          <BankDetailsForm
            key={settings.accountNumber + settings.ifscCode}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
        {currentTab === "branding" ? (
          <BrandingUploader
            logoUrl={settings.logoUrl}
            signatureUrl={settings.signatureUrl}
            onSaved={(patch) => save(patch)}
          />
        ) : null}
        {currentTab === "units" ? (
          <UnitsManager unitTypes={settings.unitTypes} onSaved={(unitTypes) => save({ unitTypes })} />
        ) : null}
        {currentTab === "defaults" ? (
          <InvoiceDefaultsForm
            key={`${settings.defaultTerms}-${settings.defaultStationeryMode}`}
            values={settings}
            onSaved={(values) => save(values)}
          />
        ) : null}
        {currentTab === "appearance" ? <AppearancePanel /> : null}
        {currentTab === "database" ? <DatabasePanel initial={database} /> : null}
        </CardContent>
      </Card>

      {initial.offline ? (
        <p className="text-sm text-muted-foreground">PostgreSQL is not connected. Changes stay in this browser.</p>
      ) : null}
    </div>
  );
}
