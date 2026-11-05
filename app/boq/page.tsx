import type { Metadata } from "next";
import { getSiteBook } from "@/actions/operations-actions";
import { BoqDesk } from "@/components/site/work-desks";

export const metadata: Metadata = { title: "Bill of quantities" };

export default async function BoqPage() {
  return <BoqDesk book={await getSiteBook()} />;
}
