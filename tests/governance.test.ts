import { subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  confirmationMatches,
  deletionAgeLabel,
  matchesGovernanceFilter,
  parentRestoreIds,
  recordsOlderThan,
  summarizeGovernance,
  type DeletedEntity,
} from "@/lib/engines/governance-engine";

const now = new Date(2026, 9, 7, 12, 0, 0);

const rows: DeletedEntity[] = [
  {
    id: "client-row",
    entityType: "clients",
    nameOrTitle: "Client",
    deletedAt: subDays(now, 3).toISOString(),
    details: "",
    parentId: null,
    parentType: null,
  },
  {
    id: "project-row",
    entityType: "projects",
    nameOrTitle: "Project",
    deletedAt: subDays(now, 3).toISOString(),
    details: "",
    parentId: "client-row",
    parentType: "clients",
  },
  {
    id: "invoice-row",
    entityType: "invoices",
    nameOrTitle: "Invoice",
    deletedAt: subDays(now, 14).toISOString(),
    details: "",
    parentId: null,
    parentType: null,
  },
  {
    id: "ledger-row",
    entityType: "ledger_entries",
    nameOrTitle: "Ledger",
    deletedAt: subDays(now, 100).toISOString(),
    details: "",
    parentId: null,
    parentType: null,
  },
];

describe("governance recycle bin", () => {
  it("requires the exact hard-purge phrase", () => {
    expect(confirmationMatches("PERMANENTLY DELETE")).toBe(true);
    expect(confirmationMatches("permanently delete")).toBe(false);
    expect(confirmationMatches("PERMANENTLY DELETE ")).toBe(false);
  });

  it("labels deletion age from the reference clock", () => {
    expect(deletionAgeLabel(subDays(now, 3).toISOString(), now)).toBe("Deleted 3 days ago");
    expect(deletionAgeLabel(subDays(now, 14).toISOString(), now)).toBe("Deleted 14 days ago");
  });

  it("restores a soft-deleted parent client with a project", () => {
    const project = rows.find((row) => row.id === "project-row");
    expect(project).toBeTruthy();
    expect(parentRestoreIds(project!, rows)).toEqual(["client-row"]);
  });

  it("selects only records older than the purge threshold", () => {
    expect(recordsOlderThan(rows, 90, now).map((row) => row.id)).toEqual(["ledger-row"]);
  });

  it("groups invoices and ledger lines together", () => {
    const finance = rows.filter((row) => matchesGovernanceFilter(row.entityType, "finance"));
    expect(finance.map((row) => row.entityType).sort()).toEqual(["invoices", "ledger_entries"]);
  });

  it("counts archived rows", () => {
    expect(summarizeGovernance(rows, now).total).toBe(4);
  });
});
