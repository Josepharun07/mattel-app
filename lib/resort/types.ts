import type { ResortLeaseStatus, ResortPaymentStatus } from "@/lib/engines/resort-engine";

export type ResortLease = {
  id: string;
  propertyName: string;
  operatorName: string;
  operatorContact: string;
  operatorEmail: string | null;
  operatorGstin: string | null;
  monthlyRentAmount: number;
  billingDueDay: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: ResortLeaseStatus;
  createdAt: string;
};

export type ResortInvoice = {
  id: string;
  resortLeaseId: string;
  propertyName: string;
  operatorName: string;
  baseInvoiceNumber: string;
  invoiceNumber: string;
  version: number;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  grandTotal: number;
  amountPaid: number;
  paymentStatus: ResortPaymentStatus;
  overdue: boolean;
  notes: string | null;
};

export type ResortPayment = {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: string;
  referenceNumber: string | null;
  notes: string | null;
};

export type ResortDirectory = {
  leases: ResortLease[];
  invoices: ResortInvoice[];
  payments: ResortPayment[];
  offline: boolean;
};
