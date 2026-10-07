import { describe, expect, it } from "vitest";
import { linesToLedgerItems } from "@/lib/invoicing/lines";
import { formatInvoiceNumber } from "@/lib/invoicing/numbering";
import { calculateInvoiceTotals } from "@/lib/invoicing/totals";
import { roundMoney } from "@/lib/money";
import { calculateOvertimePay, calculateShiftPay, calculateWeeklyPay } from "@/lib/payroll/calculations";
import { summarizePayments } from "@/lib/billing/payments";
import { isLowStock } from "@/lib/inventory/stock";
import { isReturnOverdue } from "@/lib/assets/returns";
import { calculateContractBalance } from "@/lib/subcontracts/balance";
import { readStorageConfig } from "@/lib/storage/s3";

describe("calculateOvertimePay", () => {
  it("multiplies overtime hours by the hourly rate", () => {
    expect(calculateOvertimePay(3, 250)).toBe(750);
  });

  it("rounds to paise", () => {
    expect(calculateOvertimePay(1.5, 33.33)).toBe(roundMoney(49.995));
  });
});

describe("calculateInvoiceTotals", () => {
  const selectedItems = linesToLedgerItems([
    {
      id: "aggregates",
      selected: true,
      materialName: "Quarry Aggregates",
      quantity: 20,
      unitType: "CFT",
      centralRate: 120,
      overrideRate: 120,
    },
    {
      id: "msand",
      selected: true,
      materialName: "M-Sand",
      quantity: 10,
      unitType: "Loads",
      centralRate: 4500,
      overrideRate: 4200,
    },
    {
      id: "ignored",
      selected: false,
      materialName: "Cement",
      quantity: 5,
      unitType: "Bags",
      centralRate: 420,
      overrideRate: 420,
    },
  ]);

  it("applies CGST and SGST for intra-state billing", () => {
    expect(calculateInvoiceTotals(selectedItems, true, "INTRA")).toEqual({
      subtotal: 44400,
      cgst: 3996,
      sgst: 3996,
      igst: 0,
      grandTotal: 52392,
    });
  });

  it("applies IGST for inter-state billing", () => {
    expect(calculateInvoiceTotals(selectedItems, true, "INTER")).toEqual({
      subtotal: 44400,
      cgst: 0,
      sgst: 0,
      igst: 7992,
      grandTotal: 52392,
    });
  });

  it("omits tax when GST is disabled", () => {
    expect(calculateInvoiceTotals(selectedItems, false, "INTRA")).toEqual({
      subtotal: 44400,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grandTotal: 44400,
    });
  });
});

describe("formatInvoiceNumber", () => {
  it("uses the calendar year of the issue date", () => {
    expect(formatInvoiceNumber("CONSTRUCTION", 1, new Date(2026, 2, 15))).toBe("MI/CON/2026/0001");
    expect(formatInvoiceNumber("RESORT", 12, new Date(2026, 9, 7))).toBe("MI/RES/2026/0012");
  });
});

describe("readStorageConfig", () => {
  it("reads vendor-agnostic S3 settings", () => {
    const config = readStorageConfig({
      S3_REGION: "auto",
      S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
      S3_BUCKET: "site-files",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_FORCE_PATH_STYLE: "true",
    });

    expect(config).toMatchObject({
      region: "auto",
      endpoint: "https://example.r2.cloudflarestorage.com",
      bucket: "site-files",
      forcePathStyle: true,
    });
  });
});

describe("operations calculations", () => {
  it("pays a full day plus overtime", () => {
    expect(calculateShiftPay("FULL", 800, 2, 100)).toEqual({
      basePay: 800,
      overtimePay: 200,
      total: 1000,
    });
  });

  it("pays half of the daily rate", () => {
    expect(calculateShiftPay("HALF", 800, 0, 100).basePay).toBe(400);
  });

  it("sums a weekly slip", () => {
    expect(
      calculateWeeklyPay([
        { mark: "FULL", dailyRate: 800, overtimeHours: 2, hourlyRate: 100 },
        { mark: "HALF", dailyRate: 800, overtimeHours: 0, hourlyRate: 100 },
      ]),
    ).toEqual({ basePay: 1200, overtimePay: 200, total: 1400 });
  });

  it("marks partial invoice payments", () => {
    expect(summarizePayments(52392, [{ amountPaid: 10000 }])).toEqual({
      amountPaid: 10000,
      balance: 42392,
      paymentStatus: "Partially Paid",
    });
  });

  it("flags stock at the safety threshold", () => {
    expect(isLowStock(40, 50)).toBe(true);
    expect(isLowStock(12, 4)).toBe(false);
  });

  it("flags an open return past its deadline", () => {
    expect(isReturnOverdue("2026-10-01", "", "2026-10-07")).toBe(true);
    expect(isReturnOverdue("2026-10-20", "", "2026-10-07")).toBe(false);
    expect(isReturnOverdue("2026-10-01", "2026-10-03", "2026-10-07")).toBe(false);
  });

  it("deducts draws from the contract balance", () => {
    expect(calculateContractBalance(150000, [{ amountPaid: 20000 }])).toEqual({
      drawn: 20000,
      remaining: 130000,
    });
  });
});
