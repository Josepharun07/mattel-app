"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

const settingsInput = z.object({
  companyName: z.string().trim().min(1),
  tagline: z.string().trim().optional(),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email(),
  bankName: z.string().trim().min(1),
  accountNumber: z.string().trim().min(1),
  ifscCode: z.string().trim().min(1),
  unitTypes: z.array(z.string().trim().min(1)).min(1),
});

export type SystemSettingsInput = z.infer<typeof settingsInput>;

export async function getSystemSettings() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const [row] = await db
    .select()
    .from(systemSettings)
    .where(isNull(systemSettings.deletedAt))
    .limit(1);

  return row ?? null;
}

export async function updateSystemSettings(data: SystemSettingsInput) {
  if (!process.env.DATABASE_URL) {
    return {
      success: false,
      message: "DATABASE_URL is not configured. Connect PostgreSQL and run this action again.",
    };
  }

  const parsed = settingsInput.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Enter the company name, address, phone, email, bank details, and at least one unit type.",
    };
  }

  const current = await getSystemSettings();
  const values = {
    companyName: parsed.data.companyName,
    tagline: parsed.data.tagline,
    address: parsed.data.address,
    phone: parsed.data.phone,
    email: parsed.data.email,
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    ifscCode: parsed.data.ifscCode,
    unitTypes: parsed.data.unitTypes,
    updatedAt: new Date(),
  };

  if (!current) {
    await db.insert(systemSettings).values(values);
  } else {
    await db.update(systemSettings).set(values).where(eq(systemSettings.id, current.id));
  }

  revalidatePath("/settings");
  return { success: true, message: "Company settings saved." };
}
