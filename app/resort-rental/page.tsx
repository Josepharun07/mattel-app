import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getResortLeases } from "@/controllers/resort";
import { ResortDesk } from "@/views/resort-rental/resort-desk";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Resort leases" };

export default async function ResortRentalPage() {
  const denied = await gate("resort.read");
  if (denied) return denied;

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
