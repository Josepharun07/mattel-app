import { describe, expect, it } from "vitest";
import { signInLocal } from "@/lib/auth/local";
import {
  boqProgress,
  budgetVariance,
  decidePayment,
  hireCost,
  raiseRaBill,
  recordExecution,
  seedSiteBook,
} from "@/lib/site/book";

describe("site book", () => {
  it("bills only the unbilled executed quantity", () => {
    const book = seedSiteBook();
    const line = book.boq[0];
    expect(boqProgress(line)).toBe(40);
    const moved = recordExecution(book, line.id, 70);
    expect(moved.ok).toBe(false);
    const billed = raiseRaBill(book, line.id, "2026-10-23", true);
    expect(billed.ok).toBe(true);
    if (billed.ok) {
      expect(billed.bill.quantity).toBe(40);
      expect(billed.bill.billNumber).toBe("MI/RA/2026/0001");
      expect(billed.bill.total).toBe(21240);
    }
  });

  it("prices hire and budget variance", () => {
    expect(hireCost({ id: "1", machineName: "JCB", ownership: "HIRED", operatorName: "", siteName: "", logDate: "", openingReading: 0, closingReading: 4, runHours: 4, idleHours: 1, fuelLitres: 20, hireRate: 1500, breakdown: "" })).toBe(6000);
    expect(budgetVariance(seedSiteBook().budget[0])).toBe(27000);
  });

  it("lets an owner approve a payment", () => {
    const book = seedSiteBook();
    expect(decidePayment(book, book.payments[0].id, "APPROVED", "MANAGER").ok).toBe(false);
    expect(decidePayment(book, book.payments[0].id, "APPROVED", "OWNER").ok).toBe(true);
  });

  it("signs in local staff, vendor, and client accounts", () => {
    expect(signInLocal(process.env.ADMIN_USERNAME ?? "", process.env.ADMIN_PASSWORD ?? "").ok).toBe(Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD));
    expect(signInLocal("vendor", "vendor").ok).toBe(false);
    expect(signInLocal("client", "wrong").ok).toBe(false);
  });
});
