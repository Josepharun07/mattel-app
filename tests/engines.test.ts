import { describe, expect, it } from "vitest";
import { deductInventory, isLowStockTrigger, projectStockLevel } from "@/lib/engines/inventory-engine";
import { applyDocumentVersionSuffix, calculateInvoiceTotals, generateInvoiceNumber } from "@/lib/engines/invoice-engine";
import { applyPayslipVersionSuffix, calculateStaffPayroll, generatePayslipNumber } from "@/lib/engines/payroll-engine";

describe("invoice engine", () => {
  const items = [
    { quantity: 20, rate: 120 },
    { quantity: 10, rate: 4500, overrideRate: 4200 },
  ];

  it("charges CGST and SGST inside Kerala", () => {
    expect(calculateInvoiceTotals(items, { gstEnabled: true, isInterstate: false })).toEqual({
      subtotal: 44400,
      cgst: 3996,
      sgst: 3996,
      igst: 0,
      total: 52392,
    });
  });

  it("charges IGST for an inter-state supply", () => {
    expect(calculateInvoiceTotals(items, { gstEnabled: true, isInterstate: true })).toEqual({
      subtotal: 44400,
      cgst: 0,
      sgst: 0,
      igst: 7992,
      total: 52392,
    });
  });

  it("uses the central rate when a line has no override", () => {
    expect(
      calculateInvoiceTotals([{ quantity: 10, centralRate: 45 }], {
        gstEnabled: false,
        isInterstate: false,
      }).subtotal,
    ).toBe(450);
  });

  it("builds calendar-year numbers and keeps the sequence when a revision is saved", () => {
    expect(generateInvoiceNumber("CON", 2026, 1)).toBe("MI/CON/2026/0001");
    expect(generateInvoiceNumber("RES", 2026, 12)).toBe("MI/RES/2026/0012");
    expect(applyDocumentVersionSuffix("MI/CON/2026/0001", 0)).toBe("MI/CON/2026/0001");
    expect(applyDocumentVersionSuffix("MI/CON/2026/0001", 1)).toBe("MI/CON/2026/0001-v1");
    expect(applyDocumentVersionSuffix("MI/CON/2026/0001", 2)).toBe("MI/CON/2026/0001-v2");
    expect(generatePayslipNumber(2026, 42)).toBe("MI/PAY/2026/0042");
    expect(applyPayslipVersionSuffix("MI/PAY/2026/0042", 0)).toBe("MI/PAY/2026/0042");
    expect(applyPayslipVersionSuffix("MI/PAY/2026/0042", 1)).toBe("MI/PAY/2026/0042-v1");
  });

  it("charges nothing when GST is off", () => {
    expect(calculateInvoiceTotals(items, { gstEnabled: false, isInterstate: false })).toEqual({
      subtotal: 44400,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 44400,
    });
  });
});

describe("payroll engine", () => {
  it("pays present days plus overtime hours", () => {
    expect(
      calculateStaffPayroll(900, 120, [
        { isPresent: true, overtimeHours: 2 },
        { isPresent: false, overtimeHours: 5 },
        { isPresent: true, overtimeHours: 0 },
      ]),
    ).toEqual({
      daysPresent: 2,
      totalOvertimeHours: 2,
      basePay: 1800,
      overtimePay: 240,
      totalPay: 2040,
    });
  });
});

describe("inventory engine", () => {
  it("deducts issued stock and flags the safety threshold", () => {
    expect(deductInventory(1200, 20, 100)).toEqual({
      remaining: 1180,
      issued: 20,
      lowStock: false,
    });
    expect(isLowStockTrigger(8, 10)).toBe(true);
  });

  it("adds inbound stock and blocks a deduction that would go negative", () => {
    expect(projectStockLevel(40, 10, "INBOUND_PURCHASE", 50).newStock).toBe(50);
    const blocked = projectStockLevel(8, 10, "OUTBOUND_INVOICE", 50);
    expect(blocked.permitted).toBe(false);
    expect(blocked.warning).toBe(true);
    expect(blocked.newStock).toBe(8);
  });
});
