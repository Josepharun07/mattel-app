import type { Metadata } from "next";
import { getSystemSettings } from "@/actions/settings-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { SettingsDesk } from "@/components/settings/settings-desk";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSystemSettings();

  return (
    <PageFrame
      eyebrow="System"
      title="Settings"
      description="Company profile, the operating account, branding, measurement units, invoice defaults, and the personal app colour."
      width="narrow"
    >
      <SettingsDesk initial={settings} />
    </PageFrame>
  );
}
