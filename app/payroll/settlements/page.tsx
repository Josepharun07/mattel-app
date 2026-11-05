import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { getSettlementHistory } from "@/controllers/payroll";
import { SettlementHistory } from "@/views/payroll/settlement-history";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Payroll settlements" };

export default async function PayrollSettlementsPage() {
  const denied = await gate("payroll.read");
  if (denied) return denied;

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
