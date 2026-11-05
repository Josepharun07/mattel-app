import type { Metadata } from "next";
import { getSiteBook } from "@/actions/operations-actions";
import { EquipmentDesk } from "@/components/site/work-desks";

export const metadata: Metadata = { title: "Equipment" };

export default async function EquipmentPage() {
  return <EquipmentDesk book={await getSiteBook()} />;
}
