import type { Metadata } from "next";
import { getSettlementHistory } from "@/actions/payroll-actions";
import { SettlementHistory } from "@/components/payroll/settlement-history";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Payroll settlements" };

export default async function PayrollSettlementsPage() {
  const rows = await getSettlementHistory();

  return (
    <PageFrame
      eyebrow="Workforce"
      title="Payout history"
      description="Weekly cycles and mid-week checkouts. Each payout locks the attendance days it covers."
    >
      <SettlementHistory initialRows={rows} />
    </PageFrame>
  );
}
