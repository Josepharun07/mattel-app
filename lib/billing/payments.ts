import { roundMoney } from "@/lib/money";

export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

export function summarizePayments(
  grandTotal: number,
  payments: { amountPaid: number }[],
): { amountPaid: number; balance: number; paymentStatus: PaymentStatus } {
  const amountPaid = roundMoney(
    payments.reduce((sum, payment) => sum + (Number.isFinite(payment.amountPaid) ? payment.amountPaid : 0), 0),
  );
  const balance = roundMoney(grandTotal - amountPaid);
  const paymentStatus: PaymentStatus =
    amountPaid <= 0 ? "Unpaid" : balance <= 0 ? "Paid" : "Partially Paid";

  return { amountPaid, balance, paymentStatus };
}
