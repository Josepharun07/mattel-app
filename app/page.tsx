import { gate } from "@/lib/auth/gate";
import { getCurrentSession } from "@/lib/auth/current";
import { dashboardCounts } from "@/models/dashboard";
import { getSiteBook } from "@/controllers/operations";
import { OperationsHome } from "@/views/shell/operations-home";

export default async function HomePage() {
  const denied = await gate("dashboard.view");
  if (denied) return denied;
  const [session, counts, book] = await Promise.all([getCurrentSession(), dashboardCounts(), getSiteBook()]);
  return <OperationsHome book={book} name={session?.name ?? "there"} lowStock={counts.lowStock} overdueTools={counts.overdueTools} />;
}
