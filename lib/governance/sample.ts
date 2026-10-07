import { subDays } from "date-fns";
import type { DeletedEntity } from "@/lib/engines/governance-engine";

export function buildSampleDeleted(now = new Date()): DeletedEntity[] {
  const at = (days: number) => subDays(now, days).toISOString();
  return [
    {
      id: "gov-client",
      entityType: "clients",
      nameOrTitle: "ABC Constructions",
      deletedAt: at(3),
      details: "Kochi, Kerala",
      parentId: null,
      parentType: null,
    },
    {
      id: "gov-project",
      entityType: "projects",
      nameOrTitle: "Compound Wall & Yard Fill",
      deletedAt: at(3),
      details: "Client ABC Constructions",
      parentId: "gov-client",
      parentType: "clients",
    },
    {
      id: "gov-invoice",
      entityType: "invoices",
      nameOrTitle: "MI/CON/2026/0012",
      deletedAt: at(14),
      details: "Construction invoice",
      parentId: "gov-client",
      parentType: "clients",
    },
    {
      id: "gov-ledger",
      entityType: "ledger_entries",
      nameOrTitle: "20 bags OPC Cement",
      deletedAt: at(2),
      details: "Unbilled material draw",
      parentId: "gov-project",
      parentType: "projects",
    },
    {
      id: "gov-inventory",
      entityType: "inventory_items",
      nameOrTitle: "Ordinary Portland Cement (OPC)",
      deletedAt: at(1),
      details: "Bags",
      parentId: null,
      parentType: null,
    },
    {
      id: "gov-rental",
      entityType: "asset_rentals",
      nameOrTitle: "Plate compactor PC-12",
      deletedAt: at(10),
      details: "External rental",
      parentId: null,
      parentType: null,
    },
    {
      id: "gov-staff",
      entityType: "staff",
      nameOrTitle: "Rajesh Kumar",
      deletedAt: at(2),
      details: "Mason",
      parentId: null,
      parentType: null,
    },
    {
      id: "gov-subcontract",
      entityType: "subcontracts",
      nameOrTitle: "Masonry crew",
      deletedAt: at(20),
      details: "External contractor",
      parentId: null,
      parentType: null,
    },
    {
      id: "gov-lease",
      entityType: "resort_leases",
      nameOrTitle: "Highland Hillside Villa",
      deletedAt: at(100),
      details: "Coastal Stays",
      parentId: null,
      parentType: null,
    },
  ];
}
