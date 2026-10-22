import type { Metadata } from "next";
import { getAssetCatalog } from "@/actions/rental-actions";
import { RentalDesk } from "@/components/rentals/rental-desk";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Rentals" };

export default async function RentalsPage() {
  const directory = await getAssetCatalog();

  return (
    <PageFrame
      eyebrow="Yard"
      title="Tools and rentals"
      description="Issue equipment to internal workers or external renters. An open rental past its deadline is flagged until it is returned."
      width="wide"
    >
      <RentalDesk initial={directory} />
    </PageFrame>
  );
}
