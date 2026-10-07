import type { Metadata } from "next";
import { getSoftDeletedEntities } from "@/actions/governance-actions";
import { RecycleBinTable } from "@/components/settings/recycle-bin-table";

export const metadata: Metadata = {
  title: "Recycle Bin",
};

export default async function RecycleBinPage() {
  const bin = await getSoftDeletedEntities();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Settings</p>
      <h1 className="mt-1 text-2xl font-semibold">Recycle bin</h1>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-muted-foreground">
        Deletes in Clients, Projects, Invoices, Inventory, Assets, Subcontracts, Resort Leases, and
        Staff set a deleted time. Restore clears it. Permanent deletion asks you to type the
        confirmation phrase first.
      </p>
      {bin.offline ? (
        <p className="mb-4 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
          Showing archived sample records in this browser until PostgreSQL is connected.
        </p>
      ) : null}
      <RecycleBinTable initial={bin.rows} />
    </div>
  );
}
