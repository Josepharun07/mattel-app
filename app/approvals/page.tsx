import type { Metadata } from "next";
import { getSiteBook } from "@/actions/operations-actions";
import { ApprovalsDesk } from "@/components/site/control-desks";
import { getCurrentSession } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const session = await getCurrentSession();
  return <ApprovalsDesk book={await getSiteBook()} role={session?.role ?? "OPERATOR"} />;
}
