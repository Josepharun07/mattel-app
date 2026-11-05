import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getSiteBook } from "@/controllers/operations";
import { EquipmentDesk } from "@/views/site/work-desks";

export const metadata: Metadata = { title: "Equipment" };

export default async function EquipmentPage() {
  const denied = await gate("site.read");
  if (denied) return denied;

  return <EquipmentDesk book={await getSiteBook()} />;
}
