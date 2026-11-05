import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getAssetCatalog } from "@/controllers/rentals";
import { RentalDesk } from "@/views/rentals/rental-desk";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Rentals" };

export default async function RentalsPage() {
  const denied = await gate("rentals.read");
  if (denied) return denied;

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
