import type { Metadata } from "next";
import { getSubcontracts } from "@/actions/subcontract-actions";
import { SubcontractDesk } from "@/components/subcontracts/subcontract-desk";

export const metadata: Metadata = { title: "Subcontracts" };

export default async function SubcontractsPage() {
  const directory = await getSubcontracts();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Contracts</p>
      <h1 className="mt-1 text-2xl font-semibold">Subcontracts</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Lump-sum agreements with an internal lead or an external contractor. Advance draws stop at the remaining contract balance.
      </p>
      <SubcontractDesk initial={directory} />
    </div>
  );
}
