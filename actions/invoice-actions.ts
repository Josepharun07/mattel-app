"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  inventoryItems,
  invoices,
  ledgerEntries,
  projects,
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
import { UNIT_TYPES } from "@/lib/invoicing/studio-data";
import { roundMoney } from "@/lib/money";

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

const fallbackCompany: InvoiceCompanyProfile = {
  companyName: "Mattel Infrastructures",
  tagline: "Building Tomorrow's Foundation",
  phone: "+91 98765 43210",
  email: "contact@mattelinfra.com",
  address: "Kerala, India",
  gstin: null,
  bankName: "State Bank of India",
  accountName: "Mattel Infrastructures Operating Account",
  accountNumber: "40910029831",
  ifscCode: "SBIN0001234",
  upiId: null,
  logoUrl: null,
  signatureUrl: null,
  defaultTerms: "Payment due within 15 days of issue.",
  defaultStationeryMode: false,
};

const fallbackStudio: InvoiceStudioData = {
  databaseConnected: false,
  company: fallbackCompany,
  unitTypes: [...UNIT_TYPES],
  clients: [
    {
      id: "client-abc",
      name: "ABC Constructions",
      address: "Kochi, Kerala",
      gstin: null,
      phone: "9800000001",
      email: "accounts@abc.example",
    },
    {
      id: "client-coastal",
      name: "Coastal Stays",
      address: "Alappuzha, Kerala",
      gstin: null,
      phone: "9800000002",
      email: "stay@coastal.example",
    },
  ],
  projects: [
    {
      id: "project-abc-site",
      clientId: "client-abc",
      name: "Compound Wall & Yard Fill",
      location: "Kochi, Kerala",
    },
    {
      id: "project-resort-lease",
      clientId: "client-coastal",
      name: "Guest Villa Monthly Lease",
      location: "Alappuzha, Kerala",
    },
  ],
  inventory: [
    { id: "item-msand", name: "M-Sand", unitType: "CFT", centralRate: 45, currentStock: 1200 },
    { id: "item-psand", name: "P-Sand", unitType: "CFT", centralRate: 55, currentStock: 800 },
    { id: "item-metal", name: "20mm Metal", unitType: "CFT", centralRate: 42, currentStock: 1500 },
    {
      id: "item-opc",
      name: "Ordinary Portland Cement (OPC)",
      unitType: "Bags",
      centralRate: 380,
      currentStock: 400,
    },
  ],
};

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

export async function getInvoiceStudioData(): Promise<InvoiceStudioData> {
  if (!process.env.DATABASE_URL) {
    return fallbackStudio;
  }

  try {
    const [clientRows, projectRows, itemRows, settingsRows] = await Promise.all([
      db.select().from(clients).where(isNull(clients.deletedAt)),
      db.select().from(projects).where(isNull(projects.deletedAt)),
      db.select().from(inventoryItems).where(isNull(inventoryItems.deletedAt)),
      db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1),
    ]);

    const settings = settingsRows[0];

    return {
      databaseConnected: true,
      company: {
        companyName: settings?.companyName ?? fallbackCompany.companyName,
        tagline: settings?.tagline ?? fallbackCompany.tagline,
        phone: settings?.phone || fallbackCompany.phone,
        email: settings?.email || fallbackCompany.email,
        address: settings?.address || fallbackCompany.address,
        gstin: settings?.gstin ?? null,
        bankName: settings?.bankName || fallbackCompany.bankName,
        accountName: settings?.accountName || fallbackCompany.accountName,
        accountNumber: settings?.accountNumber || fallbackCompany.accountNumber,
        ifscCode: settings?.ifscCode || fallbackCompany.ifscCode,
        upiId: settings?.upiId ?? null,
        logoUrl: settings?.logoUrl ?? null,
        signatureUrl: settings?.signatureUrl ?? null,
        defaultTerms: settings?.defaultTerms || fallbackCompany.defaultTerms,
        defaultStationeryMode: settings?.defaultStationeryMode ?? false,
      },
      unitTypes:
        settings?.unitTypes && settings.unitTypes.length > 0
          ? settings.unitTypes
          : [...UNIT_TYPES],
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
    return fallbackStudio;
  }
}

export async function getNextInvoiceNumber(type: "CON" | "RES", issueDate?: string | Date) {
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
          letterheadMode: parsed.data.letterheadMode,
          stationeryMode: !parsed.data.letterheadMode,
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
          letterheadMode: parsed.data.letterheadMode,
          stationeryMode: !parsed.data.letterheadMode,
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
