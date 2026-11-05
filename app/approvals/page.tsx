import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getSiteBook } from "@/controllers/operations";
import { ApprovalsDesk } from "@/views/site/control-desks";
import { getCurrentSession } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const denied = await gate("approvals.review");
  if (denied) return denied;

  const session = await getCurrentSession();
  return <ApprovalsDesk book={await getSiteBook()} role={session?.role ?? "OPERATOR"} />;
}
