import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/auth/current";
import { getDatabaseStatus } from "@/controllers/database";
import { getSystemSettings } from "@/controllers/settings";
import { PageFrame } from "@/views/shell/page-frame";
import { SettingsDesk } from "@/views/settings/settings-desk";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const denied = await gate("settings.read");
  if (denied) return denied;

  const session = await getCurrentSession();
  const settings = await getSystemSettings();
  const database = await getDatabaseStatus();

  return (
    <PageFrame
      eyebrow="System"
      title="Settings"
      description="Company profile, the operating account, branding, measurement units, invoice defaults, the personal app colour, the database connection, and sign out."
      width="narrow"
    >
      <SettingsDesk initial={settings} database={database} pages={session?.pages ?? []} />
    </PageFrame>
  );
}
