import type { Metadata } from "next";
import { getRentalHistory } from "@/actions/rental-actions";
import { RentalHistory } from "@/components/rentals/rental-history";

export const metadata: Metadata = { title: "Rental history" };

export default async function RentalHistoryPage() {
  const history = await getRentalHistory();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Yard</p>
      <h1 className="mt-1 text-2xl font-semibold">Rental audit log</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Every issue and return, including condition notes and the rent charged on external leases.
      </p>
      <RentalHistory initial={history} />
    </div>
  );
}
