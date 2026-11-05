import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/auth/current";
import { allows } from "@/lib/auth/rbac";
import { getSoftDeletedEntities } from "@/controllers/governance";
import { RecycleBinTable } from "@/views/settings/recycle-bin-table";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = {
  title: "Recycle Bin",
};

export default async function RecycleBinPage() {
  const denied = await gate("recycle.read");
  if (denied) return denied;

  const [bin, session] = await Promise.all([getSoftDeletedEntities(), getCurrentSession()]);

  return (
    <PageFrame
      eyebrow="Settings"
      title="Recycle bin"
      description="Deletes in clients, projects, invoices, inventory, assets, subcontracts, resort leases, and staff set a deleted time. Restore clears it. Permanent deletion asks for the confirmation phrase first."
    >
      {bin.offline ? (
        <p className="rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
          PostgreSQL is not connected, so the recycle bin is empty.
        </p>
      ) : null}
      <RecycleBinTable initial={bin.rows} canPurge={Boolean(session && allows(session, "recycle.purge"))} />
    </PageFrame>
  );
}
