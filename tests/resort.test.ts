import { describe, expect, it } from "vitest";
import {
  generateResortInvoiceNumber,
  isResortInvoiceOverdue,
  nextResortInvoiceNumber,
  resortPaymentStatus,
  resortRemainingBalance,
} from "@/lib/engines/resort-engine";

describe("resort engine", () => {
  it("numbers resort invoices by calendar year and keeps the next sequence", () => {
    expect(generateResortInvoiceNumber(2026, 1)).toBe("MI/RES/2026/0001");
    expect(nextResortInvoiceNumber(["MI/RES/2026/0001", "MI/RES/2026/0002-v1"], "2026-10-07")).toBe("MI/RES/2026/0003");
  });

  it("classifies paid, partial, and unpaid balances and flags overdue rent", () => {
    expect(resortRemainingBalance(25000, 0)).toBe(25000);
    expect(resortPaymentStatus(25000, 0)).toBe("UNPAID");
    expect(resortPaymentStatus(25000, 10000)).toBe("PARTIALLY_PAID");
    expect(resortPaymentStatus(25000, 25000)).toBe("PAID");
    expect(isResortInvoiceOverdue("UNPAID", "2026-10-01", "2026-10-07")).toBe(true);
    expect(isResortInvoiceOverdue("UNPAID", "2026-10-07", "2026-10-07")).toBe(false);
    expect(isResortInvoiceOverdue("PAID", "2026-10-01", "2026-10-07")).toBe(false);
  });
});
