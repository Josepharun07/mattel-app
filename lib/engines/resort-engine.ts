import { endOfMonth, format } from "date-fns";
import { calculateInvoiceTotals, calendarYear, documentSequence, generateInvoiceNumber } from "@/lib/engines/invoice-engine";
import { roundMoney } from "@/lib/money";

export type ResortPaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID";
export type ResortLeaseStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";

export function generateResortInvoiceNumber(year: number, sequence: number) {
  return generateInvoiceNumber("RES", year, sequence);
}

export function nextResortInvoiceNumber(existingBaseNumbers: string[], issueDate: Date | string = new Date()) {
  const year = calendarYear(issueDate);
  const prefix = `MI/RES/${year}/`;
  const maxSequence = existingBaseNumbers.reduce(
    (max, value) => Math.max(max, documentSequence(value, prefix)),
    0,
  );
  return generateResortInvoiceNumber(year, maxSequence + 1);
}

export function resortRemainingBalance(grandTotal: number, amountPaid: number) {
  return roundMoney(grandTotal - amountPaid);
}

export function resortPaymentStatus(grandTotal: number, amountPaid: number): ResortPaymentStatus {
  const remaining = resortRemainingBalance(grandTotal, amountPaid);
  if (remaining <= 0) {
    return "PAID";
  }
  if (amountPaid > 0 && amountPaid < grandTotal) {
    return "PARTIALLY_PAID";
  }
  return "UNPAID";
}

export function isResortInvoiceOverdue(status: ResortPaymentStatus, dueDate: string | null, today: string) {
  if (status === "PAID" || !dueDate) {
    return false;
  }
  return today > dueDate;
}

export function formatBillingPeriod(year: number, monthIndex: number) {
  return format(new Date(year, monthIndex, 1), "MMMM yyyy");
}

export function dueDateForBillingPeriod(year: number, monthIndex: number, billingDueDay: number) {
  const lastDay = endOfMonth(new Date(year, monthIndex, 1)).getDate();
  const day = Math.min(Math.max(1, billingDueDay), lastDay);
  return format(new Date(year, monthIndex, day), "yyyy-MM-dd");
}

export function effectiveLeaseStatus(status: ResortLeaseStatus, leaseEndDate: string, today: string): ResortLeaseStatus {
  if (status === "TERMINATED") {
    return "TERMINATED";
  }
  if (today > leaseEndDate) {
    return "EXPIRED";
  }
  return status;
}

export function resortInvoiceTotals(monthlyRent: number, gstEnabled: boolean) {
  return calculateInvoiceTotals([{ quantity: 1, rate: monthlyRent }], {
    gstEnabled,
    isInterstate: false,
  });
}

export function paymentStatusLabel(status: ResortPaymentStatus) {
  if (status === "PAID") return "Paid";
  if (status === "PARTIALLY_PAID") return "Partially Paid";
  return "Unpaid";
}
