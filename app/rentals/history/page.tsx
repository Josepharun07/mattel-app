import type { Metadata } from "next";
import { getRentalHistory } from "@/actions/rental-actions";
import { RentalHistory } from "@/components/rentals/rental-history";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Rental history" };

export default async function RentalHistoryPage() {
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
