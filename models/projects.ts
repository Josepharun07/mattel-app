import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { centralInventory, clients, inventoryItems, invoices, projectClients, projectEntries, projects } from "@/db/schema";
import { summarizePayments, type PaymentStatus } from "@/lib/billing/payments";
import { roundMoney } from "@/lib/money";

function billStanding(summary: { paymentStatus: PaymentStatus } | null): PaymentStatus | "No invoice" {
  return summary?.paymentStatus ?? "No invoice";
}

export async function listProjects() {
  if (!process.env.DATABASE_URL) {
    return { clients: [], projects: [] };
  }
  const [clientRows, projectRows, links, invoiceRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(isNull(clients.deletedAt)).orderBy(clients.name),
    db
      .select({
        id: projects.id,
        name: projects.name,
        location: projects.location,
        status: projects.status,
        active: projects.active,
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(desc(projects.createdAt)),
    db
      .select({ projectId: projectClients.projectId, clientName: clients.name })
      .from(projectClients)
      .innerJoin(clients, eq(projectClients.clientId, clients.id))
      .where(isNull(clients.deletedAt)),
    db
      .select({
        projectId: invoices.projectId,
        grandTotal: invoices.grandTotal,
        amountPaid: invoices.amountPaid,
      })
      .from(invoices)
      .where(isNull(invoices.deletedAt)),
  ]);
  const names = new Map<string, string[]>();
  for (const link of links) {
    const list = names.get(link.projectId) ?? [];
    list.push(link.clientName);
    names.set(link.projectId, list);
  }
  const bills = new Map<string, { billed: number; paid: number }>();
  for (const invoice of invoiceRows) {
    if (!invoice.projectId) continue;
    const current = bills.get(invoice.projectId) ?? { billed: 0, paid: 0 };
    current.billed = roundMoney(current.billed + Number(invoice.grandTotal));
    current.paid = roundMoney(current.paid + Number(invoice.amountPaid));
    bills.set(invoice.projectId, current);
  }
  return {
    clients: clientRows,
    projects: projectRows.map((project) => {
      const bill = bills.get(project.id);
      const summary = bill ? summarizePayments(bill.billed, [{ amountPaid: bill.paid }]) : null;
      return {
        ...project,
        location: project.location ?? "",
        clientNames: names.get(project.id) ?? [],
        unpaid: summary ? Math.max(0, summary.balance) : 0,
        invoiceStatus: billStanding(summary),
      };
    }),
  };
}

export type EntryMaterial = {
  id: string;
  source: "inventory" | "yard";
  name: string;
  unit: string;
  rate: number;
};

export async function listEntryMaterials(): Promise<EntryMaterial[]> {
  if (!process.env.DATABASE_URL) return [];
  const [stock, yard] = await Promise.all([
    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        unit: inventoryItems.unitType,
        rate: inventoryItems.centralRate,
      })
      .from(inventoryItems)
      .where(isNull(inventoryItems.deletedAt))
      .orderBy(asc(inventoryItems.name)),
    db
      .select({
        id: centralInventory.id,
        name: centralInventory.itemName,
        unit: centralInventory.unitType,
        rate: centralInventory.standardUnitRate,
      })
      .from(centralInventory)
      .where(isNull(centralInventory.deletedAt))
      .orderBy(asc(centralInventory.itemName)),
  ]);
  return [
    ...stock.map((item) => ({ id: item.id, source: "inventory" as const, name: item.name, unit: item.unit, rate: Number(item.rate) })),
    ...yard.map((item) => ({ id: item.id, source: "yard" as const, name: item.name, unit: item.unit, rate: Number(item.rate) })),
  ];
}

function openEntry(entry: {
  id: string;
  enteredAt: Date;
  item: string;
  description: string;
  quantity: string;
  unitPrice: string;
}) {
  const quantity = Number(entry.quantity);
  const unitPrice = Number(entry.unitPrice);
  return {
    id: entry.id,
    enteredAt: entry.enteredAt.toISOString(),
    item: entry.item,
    description: entry.description,
    quantity,
    unitPrice,
    total: roundMoney(quantity * unitPrice),
  };
}

export type ProjectInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  unpaid: number;
  paymentStatus: PaymentStatus;
};

export async function findProject(id: string) {
  if (!process.env.DATABASE_URL) {
    return { project: null, clients: [] as { id: string; name: string }[], entries: [], invoices: [] as ProjectInvoice[] };
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.deletedAt) {
    return { project: null, clients: [] as { id: string; name: string }[], entries: [], invoices: [] as ProjectInvoice[] };
  }
  const [clientRows, links, entryRows, invoiceRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(isNull(clients.deletedAt)).orderBy(asc(clients.name)),
    db.select({ clientId: projectClients.clientId }).from(projectClients).where(eq(projectClients.projectId, id)),
    db
      .select({
        id: projectEntries.id,
        enteredAt: projectEntries.enteredAt,
        item: projectEntries.item,
        description: projectEntries.description,
        quantity: projectEntries.quantity,
        unitPrice: projectEntries.unitPrice,
        invoiceId: projectEntries.invoiceId,
        invoiceDeletedAt: invoices.deletedAt,
      })
      .from(projectEntries)
      .leftJoin(invoices, eq(projectEntries.invoiceId, invoices.id))
      .where(eq(projectEntries.projectId, id))
      .orderBy(desc(projectEntries.enteredAt)),
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        grandTotal: invoices.grandTotal,
        amountPaid: invoices.amountPaid,
      })
      .from(invoices)
      .where(and(eq(invoices.projectId, id), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.createdAt)),
  ]);
  const assigned = links.map((link) => link.clientId);
  return {
    project: {
      id: project.id,
      name: project.name || project.title,
      location: project.location ?? "",
      status: project.status === "COMPLETED" ? ("COMPLETED" as const) : ("ACTIVE" as const),
      clientIds: assigned.length > 0 ? assigned : [project.clientId],
      active: project.active,
    },
    clients: clientRows,
    entries: entryRows.filter((entry) => !entry.invoiceId || entry.invoiceDeletedAt).map(openEntry),
    invoices: invoiceRows.map((invoice) => {
      const summary = summarizePayments(Number(invoice.grandTotal), [{ amountPaid: Number(invoice.amountPaid) }]);
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        total: Number(invoice.grandTotal),
        unpaid: Math.max(0, summary.balance),
        paymentStatus: summary.paymentStatus,
      };
    }),
  };
}

export async function listOpenEntries(ids: string[]) {
  if (!process.env.DATABASE_URL || ids.length === 0) return [];
  const rows = await db
    .select({
      id: projectEntries.id,
      enteredAt: projectEntries.enteredAt,
      item: projectEntries.item,
      description: projectEntries.description,
      quantity: projectEntries.quantity,
      unitPrice: projectEntries.unitPrice,
      invoiceId: projectEntries.invoiceId,
      invoiceDeletedAt: invoices.deletedAt,
    })
    .from(projectEntries)
    .leftJoin(invoices, eq(projectEntries.invoiceId, invoices.id))
    .where(inArray(projectEntries.id, ids));
  const open = new Map(rows.filter((entry) => !entry.invoiceId || entry.invoiceDeletedAt).map((entry) => [entry.id, openEntry(entry)]));
  return ids.flatMap((id) => {
    const entry = open.get(id);
    return entry ? [entry] : [];
  });
}
