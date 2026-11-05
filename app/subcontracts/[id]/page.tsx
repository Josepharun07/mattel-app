import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getSubcontractDetails } from "@/controllers/subcontracts";
import { PageFrame } from "@/views/shell/page-frame";
import { SubcontractDetail } from "@/views/subcontracts/subcontract-detail";

export const metadata: Metadata = { title: "Subcontract" };

export default async function SubcontractPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gate("subcontracts.read");
  if (denied) return denied;
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
