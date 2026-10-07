"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { and, eq, isNull, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoicePayments, invoices, resortLeases } from "@/db/schema";
import { documentSequence } from "@/lib/engines/invoice-engine";
import {
  effectiveLeaseStatus,
  isResortInvoiceOverdue,
  nextResortInvoiceNumber,
  resortInvoiceTotals,
  resortPaymentStatus,
  type ResortLeaseStatus,
} from "@/lib/engines/resort-engine";
import { roundMoney } from "@/lib/money";
import { buildSampleResort } from "@/lib/resort/sample";
import type { ResortDirectory, ResortInvoice, ResortLease, ResortPayment } from "@/lib/resort/types";

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function dayValue(value: Date | string | null) {
  if (!value) return today();
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

export async function getResortLeases(): Promise<ResortDirectory> {
  if (!process.env.DATABASE_URL) {
    return buildSampleResort();
  }

  try {
    const [leaseRows, invoiceRows, paymentRows] = await Promise.all([
      db.select().from(resortLeases).where(isNull(resortLeases.deletedAt)),
      db.select().from(invoices).where(and(eq(invoices.invoiceType, "RESORT"), isNull(invoices.deletedAt))),
      db.select().from(invoicePayments).where(isNull(invoicePayments.deletedAt)),
    ]);
    const current = today();
    const leases: ResortLease[] = leaseRows.map((row) => ({
      id: row.id,
      propertyName: row.propertyName,
      operatorName: row.operatorName,
      operatorContact: row.operatorContact,
      operatorEmail: row.operatorEmail,
      operatorGstin: row.operatorGstin,
      monthlyRentAmount: Number(row.monthlyRentAmount),
      billingDueDay: row.billingDueDay,
      leaseStartDate: dayValue(row.leaseStartDate),
      leaseEndDate: dayValue(row.leaseEndDate),
      status: effectiveLeaseStatus(row.status, dayValue(row.leaseEndDate), current),
      createdAt: row.createdAt.toISOString(),
    }));
    const leaseName = new Map(leases.map((row) => [row.id, row]));
    const paidByInvoice = new Map<string, number>();
    const payments: ResortPayment[] = [];
    for (const payment of paymentRows) {
      if (!invoiceRows.some((row) => row.id === payment.invoiceId)) continue;
      paidByInvoice.set(payment.invoiceId, roundMoney((paidByInvoice.get(payment.invoiceId) ?? 0) + Number(payment.amountPaid)));
      payments.push({
        id: payment.id,
        invoiceId: payment.invoiceId,
        paymentDate: dayValue(payment.paymentDate),
        amountPaid: Number(payment.amountPaid),
        paymentMode: payment.paymentMode,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
      });
    }
    const resortInvoices: ResortInvoice[] = invoiceRows.flatMap((row) => {
      if (!row.resortLeaseId) return [];
      const leaseRow = leaseName.get(row.resortLeaseId);
      const amountPaid = paidByInvoice.get(row.id) ?? Number(row.amountPaid);
      const grandTotal = Number(row.grandTotal);
      const paymentStatus = resortPaymentStatus(grandTotal, amountPaid);
      const dueDate = row.dueDate ? dayValue(row.dueDate) : today();
      return [{
        id: row.id,
        resortLeaseId: row.resortLeaseId,
        propertyName: leaseRow?.propertyName ?? "Resort property",
        operatorName: leaseRow?.operatorName ?? "Operator",
        baseInvoiceNumber: row.baseInvoiceNumber,
        invoiceNumber: row.invoiceNumber,
        version: row.version,
        billingPeriod: row.billingPeriod ?? "",
        issueDate: dayValue(row.issueDate),
        dueDate,
        subtotal: Number(row.subtotal),
        grandTotal,
        amountPaid,
        paymentStatus,
        overdue: isResortInvoiceOverdue(paymentStatus, dueDate, current),
        notes: row.notes,
      }];
    });
    return { offline: false, leases, invoices: resortInvoices, payments };
  } catch {
    return buildSampleResort();
  }
}

const leaseSchema = z.object({
  propertyName: z.string().trim().min(1),
  operatorName: z.string().trim().min(1),
  operatorContact: z.string().trim().min(1),
  operatorEmail: z.string().trim().optional(),
  operatorGstin: z.string().trim().optional(),
  monthlyRentAmount: z.number().positive(),
  billingDueDay: z.number().int().min(1).max(31),
  leaseStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaseEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createResortLease(payload: z.infer<typeof leaseSchema>) {
  const parsed = leaseSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the property, operator, rent, and lease dates." };
  }
  if (parsed.data.leaseEndDate < parsed.data.leaseStartDate) {
    return { success: false as const, message: "The lease end must be on or after the start." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This lease is kept in this session.",
    };
  }

  try {
    const [created] = await db
      .insert(resortLeases)
      .values({
        propertyName: parsed.data.propertyName,
        operatorName: parsed.data.operatorName,
        operatorContact: parsed.data.operatorContact,
        operatorEmail: parsed.data.operatorEmail || null,
        operatorGstin: parsed.data.operatorGstin || null,
        monthlyRentAmount: money(parsed.data.monthlyRentAmount),
        billingDueDay: parsed.data.billingDueDay,
        leaseStartDate: parsed.data.leaseStartDate,
        leaseEndDate: parsed.data.leaseEndDate,
        status: "ACTIVE",
      })
      .returning({ id: resortLeases.id });
    revalidatePath("/resort-rental");
    return { success: true as const, message: "Lease saved.", id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the lease.";
    return { success: false as const, message };
  }
}

const invoiceSchema = z.object({
  leaseId: z.string().min(1),
  billingPeriod: z.string().trim().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  gstEnabled: z.boolean().default(false),
});

export async function generateResortMonthlyInvoice(payload: z.infer<typeof invoiceSchema>) {
  const parsed = invoiceSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Choose the lease, billing period, and dates." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This invoice is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.leaseId).success) {
    return { success: false as const, message: "Choose a saved lease." };
  }

  try {
    const [lease] = await db
      .select()
      .from(resortLeases)
      .where(and(eq(resortLeases.id, parsed.data.leaseId), isNull(resortLeases.deletedAt)));
    if (!lease) {
      return { success: false as const, message: "That lease was not found." };
    }
    const yearPrefix = `MI/RES/${parsed.data.issueDate.slice(0, 4)}/`;
    const existing = await db
      .select({ baseInvoiceNumber: invoices.baseInvoiceNumber })
      .from(invoices)
      .where(and(like(invoices.baseInvoiceNumber, `${yearPrefix}%`), isNull(invoices.deletedAt)));
    const invoiceNumber = nextResortInvoiceNumber(
      existing.map((row) => row.baseInvoiceNumber).filter((value) => documentSequence(value, yearPrefix) > 0 || value.startsWith(yearPrefix)),
      parsed.data.issueDate,
    );
    const totals = resortInvoiceTotals(Number(lease.monthlyRentAmount), parsed.data.gstEnabled);
    const [created] = await db
      .insert(invoices)
      .values({
        baseInvoiceNumber: invoiceNumber,
        invoiceNumber,
        version: 0,
        isFinalized: true,
        resortLeaseId: lease.id,
        billingPeriod: parsed.data.billingPeriod,
        invoiceType: "RESORT",
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        subtotal: money(totals.subtotal),
        cgstAmount: money(totals.cgst),
        sgstAmount: money(totals.sgst),
        igstAmount: money(totals.igst),
        totalAmount: money(totals.total),
        cgst: money(totals.cgst),
        sgst: money(totals.sgst),
        igst: money(totals.igst),
        grandTotal: money(totals.total),
        amountPaid: "0.00",
        paymentStatus: "UNPAID",
        letterheadMode: true,
        stationeryMode: false,
        notes: parsed.data.notes?.trim() || null,
      })
      .returning({ id: invoices.id });
    revalidatePath("/resort-rental");
    revalidatePath("/resort-rental/invoices");
    revalidatePath("/invoices");
    return { success: true as const, message: `Invoice ${invoiceNumber} issued.`, id: created.id, invoiceNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not issue the lease invoice.";
    return { success: false as const, message };
  }
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountPaid: z.number().positive(),
  paymentMode: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordResortPayment(payload: z.infer<typeof paymentSchema>) {
  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the amount and payment mode." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This collection is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.invoiceId).success) {
    return { success: false as const, message: "Choose a saved invoice." };
  }

  try {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, parsed.data.invoiceId), isNull(invoices.deletedAt)));
    if (!invoice || invoice.invoiceType !== "RESORT") {
      return { success: false as const, message: "That resort invoice was not found." };
    }
    const payments = await db
      .select({ amountPaid: invoicePayments.amountPaid })
      .from(invoicePayments)
      .where(and(eq(invoicePayments.invoiceId, invoice.id), isNull(invoicePayments.deletedAt)));
    const already = payments.reduce((sum, row) => sum + Number(row.amountPaid), Number(invoice.amountPaid) > 0 && payments.length === 0 ? Number(invoice.amountPaid) : 0);
    const nextPaid = roundMoney(already + parsed.data.amountPaid);
    const status = resortPaymentStatus(Number(invoice.grandTotal), nextPaid);
    await db.transaction(async (tx) => {
      await tx.insert(invoicePayments).values({
        invoiceId: invoice.id,
        amountPaid: money(parsed.data.amountPaid),
        paymentMode: parsed.data.paymentMode,
        referenceNumber: parsed.data.referenceNumber?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
      });
      await tx
        .update(invoices)
        .set({ amountPaid: money(nextPaid), paymentStatus: status })
        .where(eq(invoices.id, invoice.id));
    });
    revalidatePath("/resort-rental");
    revalidatePath("/resort-rental/invoices");
    return { success: true as const, message: "Collection recorded.", paymentStatus: status, amountPaid: nextPaid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the collection.";
    return { success: false as const, message };
  }
}

export type { ResortLeaseStatus };
