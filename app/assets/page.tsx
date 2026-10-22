import type { Metadata } from "next";
import { AssetBoard } from "@/components/assets/AssetBoard";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <PageFrame
      eyebrow="Yard"
      title="Tools and assets"
      description="Track internal employees and external renters. A return past its deadline shows a warning."
    >
      <AssetBoard />
    </PageFrame>
  );
}
