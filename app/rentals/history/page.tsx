import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getRentalHistory } from "@/controllers/rentals";
import { RentalHistory } from "@/views/rentals/rental-history";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Rental history" };

export default async function RentalHistoryPage() {
  const denied = await gate("rentals.read");
  if (denied) return denied;

  const history = await getRentalHistory();

  return (
    <PageFrame
      eyebrow="Yard"
      title="Rental audit log"
      description="Every issue and return, including condition notes and the rent charged on external leases."
    >
      <RentalHistory initial={history} />
    </PageFrame>
  );
}
