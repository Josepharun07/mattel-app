"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import {
  bankDetailsSchema,
  brandingSchema,
  companyProfileSchema,
  defaultSystemSettings,
  invoiceDefaultsSchema,
  normalizeUnitTypes,
  unitTypesSchema,
  type SystemSettingsView,
} from "@/lib/settings/profile";
import { getPresignedUploadUrl, type BrandingFolder } from "@/lib/storage/s3-client";

function viewFromRow(row: typeof systemSettings.$inferSelect, offline: boolean): SystemSettingsView {
  return {
    companyName: row.companyName,
    tagline: row.tagline ?? defaultSystemSettings.tagline,
    address: row.address,
    phone: row.phone,
    email: row.email,
    gstin: row.gstin ?? "",
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    ifscCode: row.ifscCode,
    upiId: row.upiId ?? "",
    unitTypes: row.unitTypes.length > 0 ? row.unitTypes : [...defaultSystemSettings.unitTypes],
    logoUrl: row.logoUrl ?? "",
    signatureUrl: row.signatureUrl ?? "",
    defaultTerms: row.defaultTerms ?? defaultSystemSettings.defaultTerms,
    defaultStationeryMode: row.defaultStationeryMode,
    offline,
  };
}

async function loadRow() {
  const [row] = await db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1);
  return row ?? null;
}

export async function getSystemSettings(): Promise<SystemSettingsView> {
  if (!process.env.DATABASE_URL) {
    return { ...defaultSystemSettings, unitTypes: [...defaultSystemSettings.unitTypes], offline: true };
  }

  try {
    const current = await loadRow();
    if (current) {
      return viewFromRow(current, false);
    }

    const [created] = await db
      .insert(systemSettings)
      .values({
        ...defaultSystemSettings,
        gstin: null,
        upiId: null,
        logoUrl: null,
        signatureUrl: null,
      })
      .returning();
    revalidatePath("/settings");
    return viewFromRow(created, false);
  } catch {
    return { ...defaultSystemSettings, unitTypes: [...defaultSystemSettings.unitTypes], offline: true };
  }
}

async function savePatch(values: Partial<typeof systemSettings.$inferInsert>) {
  if (!process.env.DATABASE_URL) {
    return { success: false as const, offline: true as const, message: "Saved in this browser until PostgreSQL is connected." };
  }

  const current = await loadRow();
  const next = { ...values, updatedAt: new Date() };
  if (!current) {
    await db.insert(systemSettings).values({
      ...defaultSystemSettings,
      gstin: null,
      upiId: null,
      ...next,
    });
  } else {
    await db.update(systemSettings).set(next).where(eq(systemSettings.id, current.id));
  }
  revalidatePath("/settings");
  revalidatePath("/invoices/create");
  return { success: true as const, message: "Settings saved." };
}

export async function updateCompanyProfile(payload: unknown) {
  const parsed = companyProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? "Check the company profile." };
  }
  try {
    return await savePatch({
      companyName: parsed.data.companyName,
      tagline: parsed.data.tagline,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      gstin: parsed.data.gstin || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the company profile.";
    return { success: false as const, message };
  }
}

export async function updateBankDetails(payload: unknown) {
  const parsed = bankDetailsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? "Check the bank details." };
  }
  try {
    return await savePatch({
      bankName: parsed.data.bankName,
      accountName: parsed.data.accountName,
      accountNumber: parsed.data.accountNumber,
      ifscCode: parsed.data.ifscCode.toUpperCase(),
      upiId: parsed.data.upiId || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the bank details.";
    return { success: false as const, message };
  }
}

export async function updateBrandingAssets(payload: unknown) {
  const parsed = brandingSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Check the logo and signature addresses." };
  }
  try {
    return await savePatch({
      ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl || null } : {}),
      ...(parsed.data.signatureUrl !== undefined ? { signatureUrl: parsed.data.signatureUrl || null } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the branding files.";
    return { success: false as const, message };
  }
}

export async function updateUnitTypes(unitList: string[]) {
  const normalized = normalizeUnitTypes(unitList);
  const parsed = unitTypesSchema.safeParse({ unitTypes: normalized });
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? "Keep at least one unit." };
  }
  try {
    return await savePatch({ unitTypes: parsed.data.unitTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the units.";
    return { success: false as const, message };
  }
}

export async function updateInvoiceDefaults(payload: unknown) {
  const parsed = invoiceDefaultsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Check the invoice defaults." };
  }
  try {
    return await savePatch({
      defaultTerms: parsed.data.defaultTerms,
      defaultStationeryMode: parsed.data.defaultStationeryMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the invoice defaults.";
    return { success: false as const, message };
  }
}

export async function createBrandingUploadUrl(fileName: string, fileType: string, folder: BrandingFolder) {
  try {
    const upload = await getPresignedUploadUrl(fileName, fileType, folder);
    return { success: true as const, ...upload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare the upload.";
    return {
      success: false as const,
      offline: message.includes("not configured"),
      message,
    };
  }
}
