import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getSubcontracts } from "@/controllers/subcontracts";
import { PageFrame } from "@/views/shell/page-frame";
import { SubcontractDesk } from "@/views/subcontracts/subcontract-desk";

export const metadata: Metadata = { title: "Subcontracts" };

export default async function SubcontractsPage() {
  const denied = await gate("subcontracts.read");
  if (denied) return denied;

  const directory = await getSubcontracts();

  return (
    <PageFrame
      eyebrow="Contracts"
      title="Subcontracts"
      description="Lump-sum agreements with an internal lead or an external contractor. Advance draws stop at the remaining contract balance."
      width="wide"
    >
      <SubcontractDesk initial={directory} />
    </PageFrame>
  );
}
