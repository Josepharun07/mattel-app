import { subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  confirmationMatches,
  deletionAgeLabel,
  matchesGovernanceFilter,
  parentRestoreIds,
  recordsOlderThan,
  summarizeGovernance,
} from "@/lib/engines/governance-engine";
import { buildSampleDeleted } from "@/lib/governance/sample";

const now = new Date(2026, 9, 7, 12, 0, 0);

describe("governance recycle bin", () => {
  const rows = buildSampleDeleted(now);

  it("requires the exact hard-purge phrase", () => {
    expect(confirmationMatches("PERMANENTLY DELETE")).toBe(true);
    expect(confirmationMatches("permanently delete")).toBe(false);
    expect(confirmationMatches("PERMANENTLY DELETE ")).toBe(false);
  });

  it("labels deletion age from the reference clock", () => {
    expect(deletionAgeLabel(subDays(now, 3).toISOString(), now)).toBe("Deleted 3 days ago");
    expect(deletionAgeLabel(subDays(now, 14).toISOString(), now)).toBe("Deleted 14 days ago");
  });

  it("counts recent, high-risk, and estimated space", () => {
    expect(summarizeGovernance(rows, now)).toEqual({
      total: 9,
      recent: 5,
      highRisk: 2,
      reclaimableBytes: 13824,
      reclaimableLabel: "13.5 KB estimated",
    });
  });

  it("restores a soft-deleted parent client with a project", () => {
    const project = rows.find((row) => row.id === "gov-project");
    expect(project).toBeTruthy();
    expect(parentRestoreIds(project!, rows)).toEqual(["gov-client"]);
  });

  it("selects only records older than the purge threshold", () => {
    expect(recordsOlderThan(rows, 90, now).map((row) => row.id)).toEqual(["gov-lease"]);
  });

  it("groups invoices and ledger lines together", () => {
    const finance = rows.filter((row) => matchesGovernanceFilter(row.entityType, "finance"));
    expect(finance.map((row) => row.entityType).sort()).toEqual(["invoices", "ledger_entries"]);
  });
});
