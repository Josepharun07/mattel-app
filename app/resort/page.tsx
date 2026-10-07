import type { Metadata } from "next";
import { Suspense } from "react";
import { SplitScreenEditor } from "@/components/invoicing/SplitScreenEditor";
import { StudioSkeleton } from "@/components/invoicing/StudioSkeleton";

export const metadata: Metadata = { title: "Resort billing" };

export default function ResortPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <SplitScreenEditor documentKind="RESORT" />
    </Suspense>
  );
}
