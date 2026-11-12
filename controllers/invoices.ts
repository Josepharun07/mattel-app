"use server";

import { allowed } from "@/lib/auth/access";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  inventoryItems,
  invoices,
  ledgerEntries,
  projectEntries,
  projects,
  projectClients,
  systemSettings,
  clients,
} from "@/db/schema";
import {
  applyDocumentVersionSuffix,
  baseDocumentNumber,
  calculateInvoiceTotals,
  calendarYear,
  documentSequence,
  generateInvoiceNumber,
} from "@/lib/engines/invoice-engine";
import { writeStockAdjustment } from "@/lib/inventory/ledger";
import { roundMoney } from "@/lib/money";
import { defaultSystemSettings } from "@/lib/settings/profile";

export type InvoiceClientOption = {
  id: string;
  publicCode: string;
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
};

export type InvoiceProjectOption = {
  id: string;
  publicCode: string;
  clientId: string;
  clientIds: string[];
  name: string;
  location: string | null;
};

export type InvoiceCatalogItem = {
  id: string;
  name: string;
  unitType: string;
  centralRate: number;
  currentStock: number;
};

export type InvoiceCompanyProfile = {
  companyName: string;
  tagline: string | null;
  phone: string;
  email: string;
  address: string;
  gstin: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  defaultTerms: string;
  defaultStationeryMode: boolean;
};

export type InvoiceStudioData = {
  clients: InvoiceClientOption[];
  projects: InvoiceProjectOption[];
  inventory: InvoiceCatalogItem[];
  company: InvoiceCompanyProfile;
  unitTypes: string[];
  databaseConnected: boolean;
};

function emptyStudio(): InvoiceStudioData {
  return {
    databaseConnected: false,
    company: {
      ...defaultSystemSettings,
      gstin: null,
      upiId: null,
      logoUrl: null,
      signatureUrl: null,
    },
    unitTypes: [...defaultSystemSettings.unitTypes],
    clients: [],
    projects: [],
    inventory: [],
  };
}

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

export async function getInvoiceStudioData(): Promise<InvoiceStudioData> {
  if (!(await allowed("invoices.read"))) return emptyStudio();
  if (!process.env.DATABASE_URL) {
    return emptyStudio();
  }

  try {
    const [clientRows, projectRows, linkRows, itemRows, settingsRows] = await Promise.all([
      db.select().from(clients).where(isNull(clients.deletedAt)),
      db.select().from(projects).where(isNull(projects.deletedAt)),
      db.select().from(projectClients),
      db.select().from(inventoryItems).where(isNull(inventoryItems.deletedAt)),
      db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1),
    ]);
    const clientIdsByProject = new Map<string, string[]>();
    for (const link of linkRows) {
      const list = clientIdsByProject.get(link.projectId) ?? [];
      list.push(link.clientId);
      clientIdsByProject.set(link.projectId, list);
    }

    const settings = settingsRows[0];

    return {
      databaseConnected: true,
      company: {
        companyName: settings?.companyName ?? "",
        tagline: settings?.tagline ?? "",
        phone: settings?.phone ?? "",
        email: settings?.email ?? "",
        address: settings?.address ?? "",
        gstin: settings?.gstin ?? null,
        bankName: settings?.bankName ?? "",
        accountName: settings?.accountName ?? "",
        accountNumber: settings?.accountNumber ?? "",
        ifscCode: settings?.ifscCode ?? "",
        upiId: settings?.upiId ?? null,
        logoUrl: settings?.logoUrl ?? null,
        signatureUrl: settings?.signatureUrl ?? null,
        defaultTerms: settings?.defaultTerms ?? "",
        defaultStationeryMode: settings?.defaultStationeryMode ?? false,
      },
      unitTypes: settings?.unitTypes?.length ? settings.unitTypes : [],
      clients: clientRows.map((client) => ({
        id: client.id,
        publicCode: client.publicCode ?? "",
        name: client.name,
        address: client.address,
        gstin: client.gstin,
        phone: client.phone,
        email: client.email,
      })),
      projects: projectRows.map((project) => ({
        id: project.id,
        publicCode: project.publicCode ?? "",
        clientId: project.clientId,
        clientIds: clientIdsByProject.get(project.id) ?? [project.clientId],
        name: project.name || project.title,
        location: project.location,
      })),
      inventory: itemRows.map((item) => ({
        id: item.id,
        name: item.name,
        unitType: item.unitType,
        centralRate: Number(item.centralRate),
        currentStock: Number(item.currentStock),
      })),
    };
  } catch {
    return emptyStudio();
  }
}

export async function getNextInvoiceNumber(partyCode: string, issueDate?: string | Date) {
  if (!(await allowed("invoices.read"))) return "";
  const year = calendarYear(issueDate ?? new Date());
  const code = partyCode.trim() || "XXX1";
  const prefix = `MI/${code}/${year}/`;

  if (!process.env.DATABASE_URL) {
    return generateInvoiceNumber(code, year, 1);
  }

  try {
    const rows = await db
      .select({ baseInvoiceNumber: invoices.baseInvoiceNumber })
      .from(invoices)
      .where(and(like(invoices.baseInvoiceNumber, `${prefix}%`), isNull(invoices.deletedAt)));

    const maxSequence = rows.reduce(
      (max, row) => Math.max(max, documentSequence(row.baseInvoiceNumber, prefix)),
      0,
    );

    return generateInvoiceNumber(code, year, maxSequence + 1);
  } catch {
    return generateInvoiceNumber(code, year, 1);
  }
}

const lineSchema = z.object({
  ledgerEntryId: z.string().min(1).optional(),
  projectEntryId: z.uuid().optional(),
  inventoryItemId: z.uuid().optional(),
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitType: z.string().trim().min(1),
  centralRate: z.number().nonnegative(),
  overrideRate: z.number().nonnegative().optional(),
});

const invoicePayload = z.object({
  invoiceNumber: z.string().trim().min(1),
  invoiceType: z.enum(["CON", "RES"]),
  clientId: z.uuid(),
  projectId: z.uuid().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transitPassNo: z.string().trim().optional(),
  ewayBillNo: z.string().trim().optional(),
  letterheadMode: z.boolean(),
  gstEnabled: z.boolean(),
  isInterstate: z.boolean(),
  terms: z.string().trim().optional(),
  asDraft: z.boolean().optional(),
  invoiceName: z.string().trim().optional(),
  lines: z.array(lineSchema).min(1),
});

export type CreateInvoicePayload = z.infer<typeof invoicePayload>;

export async function createInvoice(payload: CreateInvoicePayload) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      message: "DATABASE_URL is not configured. The preview is live, and the invoice will save once PostgreSQL is connected.",
    };
  }

  const parsed = invoicePayload.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a saved client and project, then complete each material row.",
    };
  }

  const totals = calculateInvoiceTotals(
    parsed.data.lines.map((line) => ({
      quantity: line.quantity,
      centralRate: line.centralRate,
      overrideRate: line.overrideRate,
    })),
    {
      gstEnabled: parsed.data.gstEnabled,
      isInterstate: parsed.data.isInterstate,
    },
  );

  try {
    const created = await db.transaction(async (tx) => {
      const baseInvoiceNumber = baseDocumentNumber(parsed.data.invoiceNumber);
      const [invoice] = await tx
        .insert(invoices)
        .values({
          baseInvoiceNumber,
          invoiceNumber: baseInvoiceNumber,
          invoiceName: parsed.data.invoiceName ?? "",
          version: 0,
          isFinalized: parsed.data.asDraft === true ? false : true,
          clientId: parsed.data.clientId,
          projectId: parsed.data.projectId,
          invoiceType: parsed.data.invoiceType === "RES" ? "RESORT" : "CONSTRUCTION",
          issueDate: parsed.data.issueDate,
          subtotal: money(totals.subtotal),
          cgstAmount: money(totals.cgst),
          sgstAmount: money(totals.sgst),
          igstAmount: money(totals.igst),
          totalAmount: money(totals.total),
          cgst: money(totals.cgst),
          sgst: money(totals.sgst),
          igst: money(totals.igst),
          grandTotal: money(totals.total),
          transitPassNo: parsed.data.transitPassNo,
          ewayBillNo: parsed.data.ewayBillNo,
          letterheadMode: true,
          stationeryMode: false,
          notes: parsed.data.terms,
        })
        .returning({ id: invoices.id });

      for (const line of parsed.data.lines) {
        const effectiveRate = line.overrideRate ?? line.centralRate;
        const totalPrice = roundMoney(line.quantity * effectiveRate);

        if (line.ledgerEntryId) {
          await tx
            .update(ledgerEntries)
            .set({
              invoiceId: invoice.id,
              description: line.name,
              materialName: line.name,
              quantity: money(line.quantity),
              unitType: line.unitType,
              centralRate: money(line.centralRate),
              overrideRate: money(effectiveRate),
              totalPrice: money(totalPrice),
              finalPrice: money(totalPrice),
            })
            .where(and(eq(ledgerEntries.id, line.ledgerEntryId), isNull(ledgerEntries.invoiceId), isNull(ledgerEntries.deletedAt)));
          continue;
        }

        await tx.insert(ledgerEntries).values({
          projectId: parsed.data.projectId,
          invoiceId: invoice.id,
          inventoryItemId: line.inventoryItemId,
          materialName: line.name,
          quantity: money(line.quantity),
          unitType: line.unitType,
          centralRate: money(line.centralRate),
          overrideRate: money(effectiveRate),
          totalPrice: money(totalPrice),
          transitPassNumber: parsed.data.transitPassNo,
          ewayBillNumber: parsed.data.ewayBillNo,
          source: "DIRECT",
        });

        if (line.projectEntryId) {
          await tx
            .update(projectEntries)
            .set({ invoiceId: invoice.id })
            .where(eq(projectEntries.id, line.projectEntryId));
        }

        if (!line.inventoryItemId || parsed.data.asDraft === true) {
          continue;
        }

        await writeStockAdjustment(tx, {
          itemId: line.inventoryItemId,
          quantity: line.quantity,
          changeType: "OUTBOUND_INVOICE",
          referenceId: parsed.data.invoiceNumber,
          notes: line.name,
        });
      }

      return invoice;
    });

    revalidatePath("/invoices");
    revalidatePath("/invoices/create");
    revalidatePath("/inventory");
    revalidatePath("/projects", "layout");

    return {
      success: true,
      message: parsed.data.asDraft === true ? "Draft saved." : "Invoice saved.",
      data: { id: created.id, invoiceNumber: baseDocumentNumber(parsed.data.invoiceNumber), total: totals.total },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the invoice.";
    return { success: false, message };
  }
}

const revisionPayload = invoicePayload.omit({ invoiceNumber: true });

export async function getInvoiceDocument(id: string) {
  if (!(await allowed("invoices.read")) || !z.uuid().safeParse(id).success || !process.env.DATABASE_URL) return null;
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), isNull(invoices.deletedAt))).limit(1);
  if (!invoice) return null;
  const [lineRows, clientRow, projectRow, linked] = await Promise.all([
    db.select().from(ledgerEntries).where(and(eq(ledgerEntries.invoiceId, id), isNull(ledgerEntries.deletedAt))),
    invoice.clientId ? db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1) : Promise.resolve([]),
    invoice.projectId ? db.select().from(projects).where(eq(projects.id, invoice.projectId)).limit(1) : Promise.resolve([]),
    invoice.projectId
      ? db.select({ id: clients.id, name: clients.name, address: clients.address, gstin: clients.gstin }).from(projectClients).innerJoin(clients, eq(clients.id, projectClients.clientId)).where(eq(projectClients.projectId, invoice.projectId))
      : Promise.resolve([]),
  ]);
  const client = clientRow[0];
  const project = projectRow[0];
  return {
    id: invoice.id,
    projectId: invoice.projectId,
    projectName: project?.name || project?.title || "",
    invoiceName: invoice.invoiceName,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    transitPassNo: invoice.transitPassNo ?? "",
    ewayBillNo: invoice.ewayBillNo ?? "",
    terms: invoice.notes ?? "",
    gstEnabled: Number(invoice.cgstAmount) > 0 || Number(invoice.sgstAmount) > 0 || Number(invoice.igstAmount) > 0,
    interstate: Number(invoice.igstAmount) > 0,
    finalized: invoice.isFinalized,
    clientId: invoice.clientId ?? "",
    clients: (linked.length > 0 ? linked : client ? [{ id: client.id, name: client.name, address: client.address, gstin: client.gstin }] : []).map((item) => ({
      id: item.id,
      name: item.name,
      address: item.address ?? "",
      gstin: item.gstin ?? "",
    })),
    lines: lineRows.map((line) => ({
      id: line.id,
      name: line.materialName,
      unit: line.unitType,
      quantity: String(Number(line.quantity)),
      rate: String(Number(line.overrideRate || line.centralRate)),
    })),
  };
}

export async function saveDraftInvoice(id: string, payload: CreateInvoicePayload) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  const parsed = invoicePayload.safeParse(payload);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return { success: false as const, message: "Complete the draft before saving." };
  }
  const [existing] = await db.select().from(invoices).where(and(eq(invoices.id, id), isNull(invoices.deletedAt))).limit(1);
  if (!existing) return { success: false as const, message: "That invoice was not found." };
  if (existing.isFinalized) return { success: false as const, message: "A finished invoice cannot be edited." };
  const totals = calculateInvoiceTotals(
    parsed.data.lines.map((line) => ({ quantity: line.quantity, centralRate: line.centralRate, overrideRate: line.overrideRate })),
    { gstEnabled: parsed.data.gstEnabled, isInterstate: parsed.data.isInterstate },
  );
  await db.transaction(async (tx) => {
    await tx.update(invoices).set({
      invoiceName: parsed.data.invoiceName ?? existing.invoiceName,
      clientId: parsed.data.clientId,
      issueDate: parsed.data.issueDate,
      transitPassNo: parsed.data.transitPassNo,
      ewayBillNo: parsed.data.ewayBillNo,
      notes: parsed.data.terms,
      subtotal: money(totals.subtotal),
      cgstAmount: money(totals.cgst),
      sgstAmount: money(totals.sgst),
      igstAmount: money(totals.igst),
      totalAmount: money(totals.total),
      cgst: money(totals.cgst),
      sgst: money(totals.sgst),
      igst: money(totals.igst),
      grandTotal: money(totals.total),
      isFinalized: false,
    }).where(eq(invoices.id, id));
    await tx.update(ledgerEntries).set({ deletedAt: new Date() }).where(and(eq(ledgerEntries.invoiceId, id), isNull(ledgerEntries.deletedAt)));
    for (const line of parsed.data.lines) {
      const effectiveRate = line.overrideRate ?? line.centralRate;
      await tx.insert(ledgerEntries).values({
        projectId: existing.projectId,
        invoiceId: id,
        inventoryItemId: line.inventoryItemId,
        materialName: line.name,
        quantity: money(line.quantity),
        unitType: line.unitType,
        centralRate: money(line.centralRate),
        overrideRate: money(effectiveRate),
        totalPrice: money(roundMoney(line.quantity * effectiveRate)),
        source: "DIRECT",
      });
    }
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true as const, message: "Draft saved." };
}

export async function renameInvoice(id: string, invoiceName: string) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  if (!z.uuid().safeParse(id).success) return { success: false as const, message: "That invoice was not found." };
  const name = invoiceName.trim();
  const updated = await db.update(invoices).set({ invoiceName: name }).where(and(eq(invoices.id, id), isNull(invoices.deletedAt))).returning({ id: invoices.id });
  if (updated.length === 0) return { success: false as const, message: "That invoice was not found." };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true as const, message: "Invoice name saved." };
}

export async function finalizeInvoice(id: string) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  const [existing] = await db.select().from(invoices).where(and(eq(invoices.id, id), isNull(invoices.deletedAt))).limit(1);
  if (!existing) return { success: false as const, message: "That invoice was not found." };
  if (existing.isFinalized) return { success: false as const, message: "This invoice is already finished." };
  await db.update(invoices).set({ isFinalized: true }).where(eq(invoices.id, id));
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true as const, message: "Invoice finished. It can no longer be edited." };
}

export async function reviseFinishedInvoice(id: string) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  const [existing] = await db.select().from(invoices).where(and(eq(invoices.id, id), isNull(invoices.deletedAt))).limit(1);
  if (!existing) return { success: false as const, message: "That invoice was not found." };
  if (!existing.isFinalized) return { success: false as const, message: "Open the draft to edit it. A new version is only made from a finished invoice." };
  const family = await db.select({ version: invoices.version }).from(invoices).where(and(eq(invoices.baseInvoiceNumber, existing.baseInvoiceNumber), isNull(invoices.deletedAt)));
  const nextVersion = family.reduce((max, row) => Math.max(max, row.version), 0) + 1;
  const invoiceNumber = applyDocumentVersionSuffix(existing.baseInvoiceNumber, nextVersion);
  const lines = await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.invoiceId, existing.id), isNull(ledgerEntries.deletedAt)));
  const [created] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(invoices).values({
      baseInvoiceNumber: existing.baseInvoiceNumber,
      invoiceNumber,
      invoiceName: existing.invoiceName,
      version: nextVersion,
      isFinalized: false,
      clientId: existing.clientId,
      projectId: existing.projectId,
      resortLeaseId: existing.resortLeaseId,
      billingPeriod: existing.billingPeriod,
      invoiceType: existing.invoiceType,
      issueDate: existing.issueDate,
      dueDate: existing.dueDate,
      subtotal: existing.subtotal,
      cgstAmount: existing.cgstAmount,
      sgstAmount: existing.sgstAmount,
      igstAmount: existing.igstAmount,
      totalAmount: existing.totalAmount,
      cgst: existing.cgst,
      sgst: existing.sgst,
      igst: existing.igst,
      grandTotal: existing.grandTotal,
      amountPaid: "0.00",
      paymentStatus: "Unpaid",
      transitPassNo: existing.transitPassNo,
      ewayBillNo: existing.ewayBillNo,
      letterheadMode: true,
      stationeryMode: false,
      notes: existing.notes,
    }).returning({ id: invoices.id });
    if (lines.length > 0) {
      await tx.insert(ledgerEntries).values(lines.map((line) => ({
        projectId: line.projectId,
        invoiceId: inserted[0].id,
        inventoryItemId: line.inventoryItemId,
        materialName: line.materialName,
        quantity: line.quantity,
        unitType: line.unitType,
        centralRate: line.centralRate,
        overrideRate: line.overrideRate,
        totalPrice: line.totalPrice,
        finalPrice: line.finalPrice,
        source: line.source,
      })));
    }
    return inserted;
  });
  revalidatePath("/invoices");
  return { success: true as const, message: `Draft ${invoiceNumber} created. The finished invoice was left unchanged.`, data: { id: created.id } };
}

export async function updateFinalizedInvoice(invoiceId: string, updatedPayload: z.infer<typeof revisionPayload>) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  void updatedPayload;
  void invoiceId;
  return { success: false as const, message: "A finished invoice cannot be edited. Start a new version instead." };
}
