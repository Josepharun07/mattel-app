import type { Metadata } from "next";
import { getSubcontractDetails } from "@/actions/subcontract-actions";
import { SubcontractDetail } from "@/components/subcontracts/subcontract-detail";

export const metadata: Metadata = { title: "Subcontract" };

export default async function SubcontractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getSubcontractDetails(id);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Contracts</p>
      <h1 className="mt-1 text-2xl font-semibold">Contract ledger</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Team roster and every advance paid against this agreement.
      </p>
      <SubcontractDetail contractId={id} initial={contract} />
    </div>
  );
}
