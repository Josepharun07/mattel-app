import type { Metadata } from "next";
import { getSiteBook } from "@/actions/operations-actions";
import { BudgetDesk } from "@/components/site/work-desks";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  return <BudgetDesk book={await getSiteBook()} />;
}
