import type { Metadata } from "next";
import { getDatabaseStatus } from "@/actions/database-actions";
import { getSystemSettings } from "@/actions/settings-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { SettingsDesk } from "@/components/settings/settings-desk";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSystemSettings();
  const database = await getDatabaseStatus();

  return (
    <PageFrame
      eyebrow="System"
      title="Settings"
      description="Company profile, the operating account, branding, measurement units, invoice defaults, the personal app colour, the database connection, and sign out."
      width="narrow"
    >
      <SettingsDesk initial={settings} database={database} />
    </PageFrame>
  );
}
