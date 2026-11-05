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
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
};

export type InvoiceProjectOption = {
  id: string;
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
        name: client.name,
        address: client.address,
        gstin: client.gstin,
        phone: client.phone,
        email: client.email,
      })),
      projects: projectRows.map((project) => ({
        id: project.id,
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

export async function getNextInvoiceNumber(type: "CON" | "RES", issueDate?: string | Date) {
  if (!(await allowed("invoices.read"))) return "";
  const year = calendarYear(issueDate ?? new Date());
  const prefix = `MI/${type}/${year}/`;

  if (!process.env.DATABASE_URL) {
    return generateInvoiceNumber(type, year, 1);
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

    return generateInvoiceNumber(type, year, maxSequence + 1);
  } catch {
    return generateInvoiceNumber(type, year, 1);
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
          version: 0,
          isFinalized: true,
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

        if (!line.inventoryItemId) {
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
      message: "Invoice saved.",
      data: { id: created.id, invoiceNumber: baseDocumentNumber(parsed.data.invoiceNumber), total: totals.total },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the invoice.";
    return { success: false, message };
  }
}

const revisionPayload = invoicePayload.omit({ invoiceNumber: true });

export async function updateFinalizedInvoice(invoiceId: string, updatedPayload: z.infer<typeof revisionPayload>) {
  if (!(await allowed("invoices.write"))) return { success: false as const, message: "You do not have access to this." };
  const parsed = revisionPayload.safeParse(updatedPayload);
  if (!invoiceId || !parsed.success) {
    return { success: false as const, message: "Complete the revised client, date, and line items." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This revision stays in this session.",
    };
  }
  if (!z.uuid().safeParse(invoiceId).success) {
    return { success: false as const, message: "Choose a saved invoice." };
  }

  const totals = calculateInvoiceTotals(
    parsed.data.lines.map((line) => ({
      quantity: line.quantity,
      centralRate: line.centralRate,
      overrideRate: line.overrideRate,
    })),
    { gstEnabled: parsed.data.gstEnabled, isInterstate: parsed.data.isInterstate },
  );

  try {
    const [existing] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), isNull(invoices.deletedAt)));
    if (!existing) {
      return { success: false as const, message: "That invoice was not found." };
    }

    const newVersion = existing.version + 1;
    const invoiceNumber = applyDocumentVersionSuffix(existing.baseInvoiceNumber, newVersion);

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          invoiceNumber,
          version: newVersion,
          isFinalized: true,
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
        .where(eq(invoices.id, existing.id));

      await tx
        .update(ledgerEntries)
        .set({ deletedAt: new Date() })
        .where(and(eq(ledgerEntries.invoiceId, existing.id), isNull(ledgerEntries.deletedAt)));

      for (const line of parsed.data.lines) {
        const effectiveRate = line.overrideRate ?? line.centralRate;
        await tx.insert(ledgerEntries).values({
          projectId: parsed.data.projectId,
          invoiceId: existing.id,
          materialName: line.name,
          quantity: money(line.quantity),
          unitType: line.unitType,
          centralRate: money(line.centralRate),
          overrideRate: money(effectiveRate),
          totalPrice: money(roundMoney(line.quantity * effectiveRate)),
          transitPassNumber: parsed.data.transitPassNo,
          ewayBillNumber: parsed.data.ewayBillNo,
          source: "DIRECT",
        });
      }
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices/create");
    return {
      success: true as const,
      message: `Invoice revised to ${invoiceNumber}.`,
      invoiceNumber,
      version: newVersion,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not revise the invoice.";
    return { success: false as const, message };
  }
}
