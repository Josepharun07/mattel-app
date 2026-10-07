import type { Metadata } from "next";
import { getAssetCatalog } from "@/actions/rental-actions";
import { RentalDesk } from "@/components/rentals/rental-desk";

export const metadata: Metadata = { title: "Rentals" };

export default async function RentalsPage() {
  const directory = await getAssetCatalog();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Yard</p>
      <h1 className="mt-1 text-2xl font-semibold">Tools and rentals</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Issue equipment to internal workers or external renters. An open rental past its deadline is flagged until it is returned.
      </p>
      <RentalDesk initial={directory} />
    </div>
  );
}
