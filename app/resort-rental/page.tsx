import type { Metadata } from "next";
import { getResortLeases } from "@/actions/resort-actions";
import { ResortDesk } from "@/components/resort-rental/resort-desk";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Resort leases" };

export default async function ResortRentalPage() {
  const directory = await getResortLeases();

  return (
    <PageFrame
      eyebrow="Resort"
      title="Lease income"
      description="Property leases and monthly operator invoices, numbered MI/RES/YYYY/XXXX, kept apart from construction billing."
      width="wide"
    >
      <ResortDesk initial={directory} />
    </PageFrame>
  );
}
