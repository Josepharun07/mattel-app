import { desc } from "drizzle-orm";
import { db } from "@/db";
import { boqItems, budgetLines, equipmentLogs, paymentRequests, raBills } from "@/db/schema";
import type { SiteBook } from "@/lib/site/book";

function money(value: number) {
  return value.toFixed(2);
}

function num(value: string | null) {
  return Number(value ?? 0);
}

export async function loadSiteBook(): Promise<SiteBook> {
  const [boq, bills, equipment, budget, payments] = await Promise.all([
    db.select().from(boqItems),
    db.select().from(raBills).orderBy(desc(raBills.issuedOn)),
    db.select().from(equipmentLogs).orderBy(desc(equipmentLogs.logDate)),
    db.select().from(budgetLines),
    db.select().from(paymentRequests),
  ]);

  return {
    diary: [],
    boq: boq.map((row) => ({
      id: row.id,
      section: row.section,
      costCode: row.costCode,
      description: row.description,
      unit: row.unit,
      contractQty: num(row.contractQty),
      rate: num(row.rate),
      executedQty: num(row.executedQty),
    })),
    raBills: bills.map((row) => ({
      id: row.id,
      billNumber: row.billNumber,
      boqId: row.boqId,
      quantity: num(row.quantity),
      subtotal: num(row.subtotal),
      cgst: num(row.cgst),
      sgst: num(row.sgst),
      igst: num(row.igst),
      total: num(row.total),
      retentionPercent: num(row.retentionPercent),
      retentionAmount: num(row.retentionAmount),
      netPayable: num(row.netPayable),
      issuedOn: row.issuedOn,
    })),
    orders: [],
    receipts: [],
    issues: [],
    equipment: equipment.map((row) => ({
      id: row.id,
      machineName: row.machineName,
      ownership: row.ownership === "OWNED" ? "OWNED" : "HIRED",
      operatorName: row.operatorName,
      siteName: row.siteName,
      logDate: row.logDate,
      openingReading: num(row.openingReading),
      closingReading: num(row.closingReading),
      runHours: num(row.runHours),
      idleHours: num(row.idleHours),
      fuelLitres: num(row.fuelLitres),
      hireRate: num(row.hireRate),
      breakdown: row.breakdown,
    })),
    budget: budget.map((row) => ({
      id: row.id,
      costCode: row.costCode,
      name: row.name,
      budgetAmount: num(row.budgetAmount),
      committedAmount: num(row.committedAmount),
      actualAmount: num(row.actualAmount),
    })),
    drawings: [],
    rfis: [],
    submittals: [],
    talks: [],
    incidents: [],
    leave: [],
    deductions: [],
    payments: payments.map((row) => ({
      id: row.id,
      payee: row.payee,
      amount: num(row.amount),
      purpose: row.purpose,
      costCode: row.costCode,
      requestedBy: row.requestedBy,
      status: row.status === "APPROVED" || row.status === "REJECTED" ? row.status : "PENDING",
    })),
  };
}

export async function persistSiteBook(book: SiteBook) {
  await db.transaction(async (tx) => {
    await tx.delete(raBills);
    await tx.delete(boqItems);
    await tx.delete(equipmentLogs);
    await tx.delete(budgetLines);
    await tx.delete(paymentRequests);

    if (book.boq.length) {
      await tx.insert(boqItems).values(
        book.boq.map((row) => ({
          ...row,
          contractQty: money(row.contractQty),
          rate: money(row.rate),
          executedQty: money(row.executedQty),
        })),
      );
    }
    if (book.raBills.length) {
      await tx.insert(raBills).values(
        book.raBills.map((row) => ({
          ...row,
          quantity: money(row.quantity),
          subtotal: money(row.subtotal),
          cgst: money(row.cgst),
          sgst: money(row.sgst),
          igst: money(row.igst),
          total: money(row.total),
          retentionPercent: money(row.retentionPercent),
          retentionAmount: money(row.retentionAmount),
          netPayable: money(row.netPayable),
        })),
      );
    }
    if (book.equipment.length) {
      await tx.insert(equipmentLogs).values(
        book.equipment.map((row) => ({
          ...row,
          runHours: money(row.runHours),
          idleHours: money(row.idleHours),
          fuelLitres: money(row.fuelLitres),
          hireRate: money(row.hireRate),
          openingReading: money(row.openingReading),
          closingReading: money(row.closingReading),
        })),
      );
    }
    if (book.budget.length) {
      await tx.insert(budgetLines).values(
        book.budget.map((row) => ({
          ...row,
          budgetAmount: money(row.budgetAmount),
          committedAmount: money(row.committedAmount),
          actualAmount: money(row.actualAmount),
        })),
      );
    }
    if (book.payments.length) {
      await tx.insert(paymentRequests).values(book.payments.map((row) => ({ ...row, amount: money(row.amount) })));
    }
  });
}
