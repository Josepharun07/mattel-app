import type { Metadata } from "next";
import { getSoftDeletedEntities } from "@/actions/governance-actions";
import { RecycleBinTable } from "@/components/settings/recycle-bin-table";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = {
  title: "Recycle Bin",
};

export default async function RecycleBinPage() {
  const bin = await getSoftDeletedEntities();

  return (
    <PageFrame
      eyebrow="Settings"
      title="Recycle bin"
      description="Deletes in clients, projects, invoices, inventory, assets, subcontracts, resort leases, and staff set a deleted time. Restore clears it. Permanent deletion asks for the confirmation phrase first."
    >
      {bin.offline ? (
        <p className="rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
          Showing archived sample records in this browser until PostgreSQL is connected.
        </p>
      ) : null}
      <RecycleBinTable initial={bin.rows} />
    </PageFrame>
  );
}
