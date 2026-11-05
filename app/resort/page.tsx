import { gate } from "@/lib/auth/gate";
import { redirect } from "next/navigation";

export default async function ResortPage() {
  const denied = await gate("resort.read");
  if (denied) return denied;
  redirect("/resort-rental");
}
