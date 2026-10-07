import type { Metadata } from "next";
import { getSystemSettings } from "@/actions/settings-actions";
import { SettingsDesk } from "@/components/settings/settings-desk";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">System</p>
      <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Company profile, the Mattel Infrastructures operating account, logo, signature stamp, measurement units, and invoice defaults.
      </p>
      <SettingsDesk initial={settings} />
    </div>
  );
}
