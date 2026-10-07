import { finalEventPrice, type LedgerEntityType, type LedgerStockSource } from "@/lib/engines/ledger-engine";

export type LedgerEntryView = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  projectName: string;
  clientName: string;
  invoiceId: string | null;
  entityType: LedgerEntityType;
  eventType: string;
  description: string;
  quantity: number;
  unitType: string;
  centralRate: number;
  overrideRate: number;
  finalPrice: number;
  source: LedgerStockSource;
  inventoryItemId: string | null;
  vehicleNumber: string | null;
  transitPassNo: string | null;
  ewayBillNo: string | null;
  createdAt: string;
};

export type ProjectLedger = {
  project: { id: string; name: string; clientId: string; clientName: string };
  entries: LedgerEntryView[];
  offline: boolean;
};

export function buildSampleLedger(projectId: string): ProjectLedger {
  const project = {
    id: projectId || "project-abc-site",
    name: "Compound Wall & Yard Fill",
    clientId: "client-abc",
    clientName: "ABC Constructions",
  };
  const cementPrice = finalEventPrice(20, 380);
  const entries: LedgerEntryView[] = [
    {
      id: "ledger-opc",
      projectId: project.id,
      clientId: project.clientId,
      projectName: project.name,
      clientName: project.clientName,
      invoiceId: null,
      entityType: "PROJECT",
      eventType: "MATERIAL_DRAW",
      description: "20 bags OPC Cement issued from central storage to site",
      quantity: 20,
      unitType: "Bags",
      centralRate: 380,
      overrideRate: 380,
      finalPrice: cementPrice,
      source: "CENTRAL_INVENTORY",
      inventoryItemId: "item-opc",
      vehicleNumber: "KL-07-AB-2210",
      transitPassNo: "TP-2210",
      ewayBillNo: null,
      createdAt: "2026-10-06T12:00:00.000Z",
    },
    {
      id: "ledger-labor",
      projectId: project.id,
      clientId: project.clientId,
      projectName: project.name,
      clientName: project.clientName,
      invoiceId: null,
      entityType: "PROJECT",
      eventType: "LABOR_SERVICE",
      description: "Site labour for compound wall footing",
      quantity: 2,
      unitType: "Days",
      centralRate: 900,
      overrideRate: 900,
      finalPrice: finalEventPrice(2, 900),
      source: "DIRECT_PURCHASE",
      inventoryItemId: null,
      vehicleNumber: null,
      transitPassNo: null,
      ewayBillNo: null,
      createdAt: "2026-10-07T12:00:00.000Z",
    },
    {
      id: "ledger-billed",
      projectId: project.id,
      clientId: project.clientId,
      projectName: project.name,
      clientName: project.clientName,
      invoiceId: "invoice-seed",
      entityType: "PROJECT",
      eventType: "MATERIAL_DRAW",
      description: "M-Sand already billed",
      quantity: 10,
      unitType: "CFT",
      centralRate: 45,
      overrideRate: 45,
      finalPrice: finalEventPrice(10, 45),
      source: "DIRECT_PURCHASE",
      inventoryItemId: null,
      vehicleNumber: null,
      transitPassNo: null,
      ewayBillNo: null,
      createdAt: "2026-10-01T12:00:00.000Z",
    },
  ];

  return { project, entries, offline: true };
}
