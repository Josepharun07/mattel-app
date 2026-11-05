"use client";

import { useState } from "react";
import { usePageState } from "@/lib/navigation/page-memory";
import { Building2, CreditCard, Database, FileSignature, LogOut, Palette, Settings, Sliders } from "lucide-react";
import { signOutAction } from "@/controllers/auth";
import type { DatabaseStatus } from "@/controllers/database";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import { Card, CardContent } from "@/views/ui/card";
import { AppearancePanel } from "@/views/settings/appearance-panel";
import { DatabasePanel } from "@/views/settings/database-panel";
import { BankDetailsForm } from "@/views/settings/bank-details-form";
import { BrandingUploader } from "@/views/settings/branding-uploader";
import { CompanyProfileForm } from "@/views/settings/company-profile-form";
import { InvoiceDefaultsForm } from "@/views/settings/invoice-defaults-form";
import { UnitsManager } from "@/views/settings/units-manager";
import type { SystemSettingsView } from "@/lib/settings/profile";
import { useWorkspace } from "@/lib/workspace/store";

const tabs = [
  { id: "profile", label: "Company Profile", icon: Building2 },
  { id: "bank", label: "Bank Account Details", icon: CreditCard },
  { id: "branding", label: "Branding & Assets", icon: FileSignature },
  { id: "units", label: "Measurement Units", icon: Sliders },
  { id: "defaults", label: "Invoice Defaults", icon: Settings },
  { id: "appearance", label: "App Settings", icon: Palette },
  { id: "database", label: "Database", icon: Database },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsDesk({
  initial,
  database,
  pages,
}: {
  initial: SystemSettingsView;
  database: DatabaseStatus;
  pages: "all" | string[];
}) {
  const confirm = useConfirm();
  const workspace = useWorkspace();
  const [tab, setTab] = usePageState<TabId>("tab", "profile");
  const [settings, setSettings] = useState(initial);
  const visibleTabs = tabs.filter((item) => pages === "all" || pages.includes(`settings.${item.id}`));
  const currentTab = visibleTabs.some((item) => item.id === tab) ? tab : visibleTabs[0]?.id;

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
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <Button
              key={item.id}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setTab(item.id)}
            >
              <Icon className="size-4" />
              {item.label}
            </Button>
          );
        })}
      </div>

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

      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End this session on this browser.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void (async () => {
                const accepted = await confirm({ title: "Sign out?", detail: "This ends the session on this browser." });
                if (!accepted) return;
                await signOutAction();
                window.location.assign("/");
              })();
            }}
          >
            <LogOut />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
