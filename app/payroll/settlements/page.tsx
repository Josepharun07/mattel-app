import type { Metadata } from "next";
import { getSettlementHistory } from "@/actions/payroll-actions";
import { SettlementHistory } from "@/components/payroll/settlement-history";

export const metadata: Metadata = { title: "Payroll settlements" };

export default async function PayrollSettlementsPage() {
  const rows = await getSettlementHistory();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Workforce</p>
      <h1 className="mt-1 text-2xl font-semibold">Payout history</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Weekly cycles and mid-week checkouts. Each payout locks the attendance days it covers.
      </p>
      <SettlementHistory initialRows={rows} />
    </div>
  );
}
