import type { Metadata } from "next";
import { getResortLeases } from "@/actions/resort-actions";
import { ResortDesk } from "@/components/resort-rental/resort-desk";

export const metadata: Metadata = { title: "Resort leases" };

export default async function ResortRentalPage() {
  const directory = await getResortLeases();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Resort</p>
      <h1 className="mt-1 text-2xl font-semibold">Lease income</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Property leases and monthly operator invoices, numbered MI/RES/YYYY/XXXX, kept apart from construction billing.
      </p>
      <ResortDesk initial={directory} />
    </div>
  );
}
