import type { Metadata } from "next";
import { AssetBoard } from "@/components/assets/AssetBoard";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Rentals</p>
      <h1 className="mt-1 text-2xl font-semibold">Tools and assets</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Track internal employees and external renters. A return past its deadline shows a warning.
      </p>
      <AssetBoard />
    </div>
  );
}
