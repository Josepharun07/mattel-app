import { getSiteBook } from "@/actions/operations-actions";
import { OperationsHome } from "@/components/shell/operations-home";
import { getCurrentSession } from "@/lib/auth/current";

export default async function HomePage() {
  const session = await getCurrentSession();
  return <OperationsHome book={await getSiteBook()} name={session?.name ?? "there"} />;
}
