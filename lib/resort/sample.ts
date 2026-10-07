import { format } from "date-fns";
import {
  effectiveLeaseStatus,
  isResortInvoiceOverdue,
  resortPaymentStatus,
  resortRemainingBalance,
} from "@/lib/engines/resort-engine";
import type { ResortDirectory, ResortInvoice, ResortLease } from "@/lib/resort/types";

function lease(row: Omit<ResortLease, "status"> & { status?: ResortLease["status"] }, today: string): ResortLease {
  const stored = row.status ?? "ACTIVE";
  return { ...row, status: effectiveLeaseStatus(stored, row.leaseEndDate, today) };
}

function invoice(row: Omit<ResortInvoice, "paymentStatus" | "overdue">, today: string): ResortInvoice {
  const paymentStatus = resortPaymentStatus(row.grandTotal, row.amountPaid);
  return {
    ...row,
    paymentStatus,
    overdue: isResortInvoiceOverdue(paymentStatus, row.dueDate, today),
  };
}

export function buildSampleResort(today = new Date()): ResortDirectory {
  const current = format(today, "yyyy-MM-dd");
  const riverside: ResortLease = lease({
    id: "lease-riverside",
    propertyName: "Mattel Riverside Resort",
    operatorName: "Apex Hospitality Pvt Ltd",
    operatorContact: "9847003300",
    operatorEmail: "accounts@apex.example",
    operatorGstin: null,
    monthlyRentAmount: 25000,
    billingDueDay: 1,
    leaseStartDate: "2026-04-01",
    leaseEndDate: "2027-03-31",
    createdAt: new Date("2026-04-01T00:00:00.000Z").toISOString(),
  }, current);
  const villa: ResortLease = lease({
    id: "lease-villa",
    propertyName: "Highland Hillside Villa",
    operatorName: "Coastal Stays",
    operatorContact: "9800000002",
    operatorEmail: "stay@coastal.example",
    operatorGstin: null,
    monthlyRentAmount: 18000,
    billingDueDay: 5,
    leaseStartDate: "2026-01-01",
    leaseEndDate: "2026-12-31",
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  }, current);

  const october = invoice({
    id: "res-inv-oct",
    resortLeaseId: riverside.id,
    propertyName: riverside.propertyName,
    operatorName: riverside.operatorName,
    baseInvoiceNumber: "MI/RES/2026/0001",
    invoiceNumber: "MI/RES/2026/0001",
    version: 0,
    billingPeriod: "October 2026",
    issueDate: "2026-10-01",
    dueDate: "2026-10-01",
    subtotal: 25000,
    grandTotal: 25000,
    amountPaid: 0,
    notes: "October lease rent",
  }, current);
  const september = invoice({
    id: "res-inv-sep",
    resortLeaseId: villa.id,
    propertyName: villa.propertyName,
    operatorName: villa.operatorName,
    baseInvoiceNumber: "MI/RES/2026/0002",
    invoiceNumber: "MI/RES/2026/0002",
    version: 0,
    billingPeriod: "September 2026",
    issueDate: "2026-09-01",
    dueDate: "2026-09-05",
    subtotal: 18000,
    grandTotal: 18000,
    amountPaid: 18000,
    notes: "September lease rent",
  }, current);

  return {
    offline: true,
    leases: [riverside, villa],
    invoices: [october, september],
    payments: [
      {
        id: "res-pay-sep",
        invoiceId: september.id,
        paymentDate: "2026-09-05",
        amountPaid: 18000,
        paymentMode: "BANK_TRANSFER",
        referenceNumber: "NEFT-SEP-18",
        notes: "September rent",
      },
    ],
  };
}

export function resortOutstanding(invoices: ResortInvoice[]) {
  return invoices.reduce((sum, row) => sum + Math.max(0, resortRemainingBalance(row.grandTotal, row.amountPaid)), 0);
}
