import { describe, expect, it } from "vitest";
import { closeSettlement } from "@/lib/engines/payroll-engine";
import { compileInvoiceHref, finalEventPrice, getUnbilledLedgerRows, ingestProjectEvent, resetRateToCentral, selectedUnbilledValue, summarizeProjectLedger } from "@/lib/engines/ledger-engine";
import { buildSampleLedger } from "@/lib/ledger/sample";
import { buildSamplePayroll } from "@/lib/payroll/sample";
import { buildSettlementPreview } from "@/lib/payroll/settle";

describe("ledger ingestion", () => {
  it("prices a central draw and keeps billed rows out of the open book", () => {
    const event = ingestProjectEvent({
      projectId: "project-abc-site",
      clientId: "client-abc",
      entityType: "PROJECT",
      eventType: "MATERIAL_DRAW",
      description: "20 bags OPC Cement issued from central storage to site",
      quantity: 20,
      unitType: "Bags",
      centralRate: 380,
      overrideRate: 380,
      source: "CENTRAL_INVENTORY",
      inventoryItemId: "item-opc",
    });
    expect(event).toMatchObject({ finalPrice: 7600, deductStock: true });
    expect(finalEventPrice(20, 380)).toBe(7600);

    const rows = [
      { id: "open", projectId: "project-abc-site", clientId: "client-abc", invoiceId: null, description: "Open", quantity: 1, unitType: "Bags", centralRate: 10, overrideRate: 10, finalPrice: 10 },
      { id: "billed", projectId: "project-abc-site", clientId: "client-abc", invoiceId: "inv", description: "Billed", quantity: 1, unitType: "Bags", centralRate: 10, overrideRate: 10, finalPrice: 10 },
      { id: "other", projectId: "other", clientId: "client-abc", invoiceId: null, description: "Other", quantity: 1, unitType: "Bags", centralRate: 10, overrideRate: 10, finalPrice: 10 },
    ];
    expect(getUnbilledLedgerRows(rows, "project-abc-site", "PROJECT").map((row) => row.id)).toEqual(["open"]);
  });

  it("summarizes unbilled value and resets an override to the central rate", () => {
    const ledger = buildSampleLedger("project-abc-site");
    const stats = summarizeProjectLedger(ledger.entries);
    expect(stats.unbilledValue).toBe(9400);
    expect(stats.billedValue).toBe(450);
    expect(stats.pendingMaterialDraws).toBe(1);
    expect(stats.activeEventCount).toBe(2);
    expect(resetRateToCentral(20, 400)).toEqual({ centralRate: 400, overrideRate: 400, finalPrice: 8000 });
    expect(selectedUnbilledValue(getUnbilledLedgerRows(ledger.entries, ledger.project.id, "PROJECT"), ["ledger-opc"])).toBe(7600);
    expect(compileInvoiceHref("project-abc-site", ["ledger-opc", "ledger-labor"])).toBe(
      "/invoices/create?projectId=project-abc-site&entryIds=ledger-opc%2Cledger-labor",
    );
  });
});

describe("settlement carryover", () => {
  it("carries an underpayment forward and an overpayment as the next advance", () => {
    const under = closeSettlement({
      grossEarned: 1000,
      priorBalanceCarryover: 200,
      priorAdvanceCarryover: 50,
      currentCycleAdvances: 100,
      manualAmountPaid: 800,
    });
    expect(under.totalDeductions).toBe(150);
    expect(under.netAmountDue).toBe(1050);
    expect(under.closingBalance).toBe(-250);
    expect(under.newBalanceCarryover).toBe(250);
    expect(under.newAdvanceCarryover).toBe(0);

    const over = closeSettlement({ ...under, manualAmountPaid: 1200, grossEarned: 1000, priorBalanceCarryover: 200, priorAdvanceCarryover: 50, currentCycleAdvances: 100 });
    expect(over.netAmountDue).toBe(1050);
    expect(over.newAdvanceCarryover).toBe(150);
    expect(over.newBalanceCarryover).toBe(0);

    const exact = closeSettlement({
      grossEarned: 1000,
      priorBalanceCarryover: 0,
      priorAdvanceCarryover: 0,
      currentCycleAdvances: 0,
    });
    expect(exact.amountPaid).toBe(1000);
    expect(exact.closingBalance).toBe(0);
    expect(exact.newBalanceCarryover).toBe(0);
    expect(exact.newAdvanceCarryover).toBe(0);
  });

  it("includes an earlier unsettled week, the unpaid balance, and the open advance", () => {
    const dash = buildSamplePayroll("2026-10-05", "2026-10-11", new Date(2026, 9, 7));
    const preview = buildSettlementPreview({
      staff: dash.staff[0],
      attendance: [...dash.earlierUnsettled, ...dash.attendance],
      advances: dash.advances,
      settlements: dash.settlements,
      endDate: "2026-10-11",
    });
    expect(preview.daysPresent).toBe(4);
    expect(preview.grossEarned).toBe(3960);
    expect(preview.priorBalanceCarryover).toBe(400);
    expect(preview.currentCycleAdvances).toBe(500);
    expect(preview.netAmountDue).toBe(3860);
  });
});
