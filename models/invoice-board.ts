import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, ledgerEntries, projects } from "@/db/schema";
import { summarizePayments, type PaymentStatus } from "@/lib/billing/payments";

export type InvoiceFolder = {
  id: string;
  name: string;
  publicCode: string;
  count: number;
  unpaid: number;
};

export type FolderInvoiceLine = {
  name: string;
  unit: string;
  quantity: number;
  rate: number;
};

export type FolderInvoice = {
  id: string;
  invoiceName: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  unpaid: number;
  paymentStatus: PaymentStatus;
  finalized: boolean;
  clientName: string;
  clientAddress: string;
  clientGstin: string;
  transitPassNo: string;
  ewayBillNo: string;
  lines: FolderInvoiceLine[];
};

export async function listInvoiceFolders(): Promise<InvoiceFolder[]> {
  if (!process.env.DATABASE_URL) return [];
  const [projectRows, invoiceRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, title: projects.title, publicCode: projects.publicCode, createdAt: projects.createdAt })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(desc(projects.createdAt)),
    db
      .select({
        projectId: invoices.projectId,
        grandTotal: invoices.grandTotal,
        amountPaid: invoices.amountPaid,
      })
      .from(invoices)
      .where(isNull(invoices.deletedAt)),
  ]);
  const totals = new Map<string, { count: number; unpaid: number }>();
  for (const invoice of invoiceRows) {
    if (!invoice.projectId) continue;
    const current = totals.get(invoice.projectId) ?? { count: 0, unpaid: 0 };
    const summary = summarizePayments(Number(invoice.grandTotal), [{ amountPaid: Number(invoice.amountPaid) }]);
    current.count += 1;
    current.unpaid += Math.max(0, summary.balance);
    totals.set(invoice.projectId, current);
  }
  return projectRows.map((project) => ({
    id: project.id,
    name: project.name || project.title,
    publicCode: project.publicCode ?? "",
    count: totals.get(project.id)?.count ?? 0,
    unpaid: totals.get(project.id)?.unpaid ?? 0,
  }));
}

export async function listFolderInvoices(projectId: string): Promise<FolderInvoice[]> {
  if (!process.env.DATABASE_URL) return [];
  const rows = await db
    .select({
      id: invoices.id,
      invoiceName: invoices.invoiceName,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      grandTotal: invoices.grandTotal,
      amountPaid: invoices.amountPaid,
      isFinalized: invoices.isFinalized,
      transitPassNo: invoices.transitPassNo,
      ewayBillNo: invoices.ewayBillNo,
      clientName: clients.name,
      clientAddress: clients.address,
      clientGstin: clients.gstin,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.projectId, projectId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));
  const ids = rows.map((invoice) => invoice.id);
  const lineRows = ids.length === 0
    ? []
    : await db
      .select({
        invoiceId: ledgerEntries.invoiceId,
        name: ledgerEntries.materialName,
        unit: ledgerEntries.unitType,
        quantity: ledgerEntries.quantity,
        rate: ledgerEntries.overrideRate,
        centralRate: ledgerEntries.centralRate,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .where(and(inArray(ledgerEntries.invoiceId, ids), isNull(ledgerEntries.deletedAt)))
      .orderBy(asc(ledgerEntries.createdAt));
  const linesByInvoice = new Map<string, FolderInvoiceLine[]>();
  for (const line of lineRows) {
    if (!line.invoiceId) continue;
    const bucket = linesByInvoice.get(line.invoiceId) ?? [];
    if (bucket.length < 6) {
      bucket.push({
        name: line.name,
        unit: line.unit,
        quantity: Number(line.quantity),
        rate: Number(line.rate) || Number(line.centralRate),
      });
    }
    linesByInvoice.set(line.invoiceId, bucket);
  }
  return rows.map((invoice) => {
    const summary = summarizePayments(Number(invoice.grandTotal), [{ amountPaid: Number(invoice.amountPaid) }]);
    return {
      id: invoice.id,
      invoiceName: invoice.invoiceName,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      total: Number(invoice.grandTotal),
      unpaid: Math.max(0, summary.balance),
      paymentStatus: summary.paymentStatus,
      finalized: invoice.isFinalized,
      clientName: invoice.clientName ?? "",
      clientAddress: invoice.clientAddress ?? "",
      clientGstin: invoice.clientGstin ?? "",
      transitPassNo: invoice.transitPassNo ?? "",
      ewayBillNo: invoice.ewayBillNo ?? "",
      lines: linesByInvoice.get(invoice.id) ?? [],
    };
  });
}
