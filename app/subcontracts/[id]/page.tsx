import type { Metadata } from "next";
import { getSubcontractDetails } from "@/actions/subcontract-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { SubcontractDetail } from "@/components/subcontracts/subcontract-detail";

export const metadata: Metadata = { title: "Subcontract" };

export default async function SubcontractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getSubcontractDetails(id);

  return (
    <PageFrame
      eyebrow="Contracts"
      title="Contract"
      description="Team roster and every advance paid against this agreement."
    >
      <SubcontractDetail contractId={id} initial={contract} />
    </PageFrame>
  );
}
