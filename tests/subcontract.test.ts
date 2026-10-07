import { describe, expect, it } from "vitest";
import {
  assessDraw,
  payoutProgress,
  remainingContractBalance,
  statusAfterDraw,
  totalAdvancesDrawn,
  validateLead,
} from "@/lib/engines/subcontract-engine";
import { buildSampleSubcontracts } from "@/lib/subcontracts/sample";

describe("subcontract engine", () => {
  it("subtracts advances from the lump sum and caps progress at 100", () => {
    const drawn = totalAdvancesDrawn([{ amountPaid: 50000 }, { amountPaid: 25000 }]);
    expect(drawn).toBe(75000);
    expect(remainingContractBalance(250000, drawn)).toBe(175000);
    expect(payoutProgress(250000, 50000)).toBe(20);
    expect(payoutProgress(80000, 80000)).toBe(100);
    expect(payoutProgress(80000, 90000)).toBe(100);
  });

  it("refuses an advance larger than the remaining balance", () => {
    expect(assessDraw(200000, 200001).ok).toBe(false);
    expect(assessDraw(200000, 200000)).toEqual({ ok: true, remainingAfter: 0 });
    expect(statusAfterDraw("ACTIVE", 0)).toBe("COMPLETED");
    expect(statusAfterDraw("TERMINATED", 0)).toBe("TERMINATED");
  });

  it("requires a staff lead internally and a name plus phone externally", () => {
    expect(validateLead({ leadPersonType: "INTERNAL_WORKER", leadStaffId: null }).ok).toBe(false);
    expect(validateLead({ leadPersonType: "INTERNAL_WORKER", leadStaffId: "staff-rajesh" }).ok).toBe(true);
    expect(validateLead({ leadPersonType: "EXTERNAL_CONTRACTOR", externalLeadName: "Anil", externalLeadPhone: "" }).ok).toBe(false);
    expect(
      validateLead({
        leadPersonType: "EXTERNAL_CONTRACTOR",
        externalLeadName: "Anil Crew",
        externalLeadPhone: "9800000099",
      }).ok,
    ).toBe(true);
  });

  it("builds one completed contract and two open balances", () => {
    const directory = buildSampleSubcontracts(new Date(2026, 9, 7));
    const masonry = directory.contracts.find((row) => row.id === "sub-masonry");
    const plaster = directory.contracts.find((row) => row.id === "sub-plaster");
    expect(masonry?.remainingBalance).toBe(200000);
    expect(masonry?.progress).toBe(20);
    expect(plaster?.status).toBe("COMPLETED");
    expect(directory.contracts.filter((row) => row.status === "ACTIVE")).toHaveLength(2);
  });
});