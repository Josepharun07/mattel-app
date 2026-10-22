import type { Metadata } from "next";
import { getSubcontracts } from "@/actions/subcontract-actions";
import { PageFrame } from "@/components/shell/page-frame";
import { SubcontractDesk } from "@/components/subcontracts/subcontract-desk";

export const metadata: Metadata = { title: "Subcontracts" };

export default async function SubcontractsPage() {
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
