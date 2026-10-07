import { differenceInDays, formatDistance, parseISO } from "date-fns";

export const PURGE_CONFIRMATION = "PERMANENTLY DELETE";

export const governanceEntityTypes = [
  "clients",
  "projects",
  "invoices",
  "ledger_entries",
  "inventory_items",
  "asset_rentals",
  "staff",
  "subcontracts",
  "resort_leases",
] as const;

export type GovernanceEntityType = (typeof governanceEntityTypes)[number];

export type GovernanceFilter = "all" | "parties" | "finance" | "stock" | "people";

export type DeletedEntity = {
  id: string;
  entityType: GovernanceEntityType;
  nameOrTitle: string;
  deletedAt: string;
  details: string;
  parentId: string | null;
  parentType: GovernanceEntityType | null;
};

const labels: Record<GovernanceEntityType, string> = {
  clients: "Client",
  projects: "Project",
  invoices: "Invoice",
  ledger_entries: "Ledger line",
  inventory_items: "Inventory item",
  asset_rentals: "Asset rental",
  staff: "Staff",
  subcontracts: "Subcontract",
  resort_leases: "Resort lease",
};

const filters: Record<Exclude<GovernanceFilter, "all">, GovernanceEntityType[]> = {
  parties: ["clients", "projects", "resort_leases"],
  finance: ["invoices", "ledger_entries"],
  stock: ["inventory_items", "asset_rentals"],
  people: ["staff", "subcontracts"],
};

const highRisk = new Set<GovernanceEntityType>(["invoices", "ledger_entries"]);
const rowBytes = 1536;

export function entityLabel(entityType: GovernanceEntityType) {
  return labels[entityType];
}

export function isGovernanceEntityType(value: string): value is GovernanceEntityType {
  return governanceEntityTypes.includes(value as GovernanceEntityType);
}

export function deletionAgeLabel(deletedAt: string, now = new Date()) {
  return `Deleted ${formatDistance(parseISO(deletedAt), now)} ago`;
}

export function isRecentDeletion(deletedAt: string, now = new Date(), withinDays = 7) {
  const age = differenceInDays(now, parseISO(deletedAt));
  return age >= 0 && age <= withinDays;
}

export function isHighRiskEntity(entityType: GovernanceEntityType) {
  return highRisk.has(entityType);
}

export function matchesGovernanceFilter(entityType: GovernanceEntityType, filter: GovernanceFilter) {
  if (filter === "all") {
    return true;
  }
  return filters[filter].includes(entityType);
}

export function confirmationMatches(confirmationText: string) {
  return confirmationText === PURGE_CONFIRMATION;
}

export function parentRestoreIds(target: DeletedEntity, rows: DeletedEntity[]) {
  if (target.entityType !== "projects" || !target.parentId) {
    return [];
  }
  const parent = rows.find(
    (row) => row.entityType === "clients" && row.id === target.parentId,
  );
  return parent ? [parent.id] : [];
}

export function recordsOlderThan(rows: DeletedEntity[], daysThreshold: number, now = new Date()) {
  return rows.filter((row) => differenceInDays(now, parseISO(row.deletedAt)) > daysThreshold);
}

export function summarizeGovernance(rows: DeletedEntity[], now = new Date()) {
  const recent = rows.filter((row) => isRecentDeletion(row.deletedAt, now)).length;
  const risky = rows.filter((row) => isHighRiskEntity(row.entityType)).length;
  const bytes = rows.length * rowBytes;
  return {
    total: rows.length,
    recent,
    highRisk: risky,
    reclaimableBytes: bytes,
    reclaimableLabel: bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB estimated` : `${bytes} B estimated`,
  };
}
