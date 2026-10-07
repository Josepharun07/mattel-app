import { z } from "zod";

export const DEFAULT_UNIT_TYPES = ["Loads", "Bags", "CFT", "Tons", "Hours", "Days", "Trips"] as const;

export const defaultSystemSettings = {
  companyName: "Mattel Infrastructures",
  tagline: "Building Tomorrow's Foundation",
  address: "Kerala, India",
  phone: "+91 98765 43210",
  email: "contact@mattelinfra.com",
  gstin: "",
  bankName: "State Bank of India",
  accountName: "Mattel Infrastructures Operating Account",
  accountNumber: "40910029831",
  ifscCode: "SBIN0001234",
  upiId: "",
  unitTypes: [...DEFAULT_UNIT_TYPES] as string[],
  logoUrl: "",
  signatureUrl: "",
  defaultTerms: "Payment due within 15 days of issue.",
  defaultStationeryMode: false,
};

export type SystemSettingsView = typeof defaultSystemSettings & { offline: boolean };

const companyName = z
  .string()
  .trim()
  .min(1, "Enter the company name.")
  .refine((value) => !/\bllp\b/i.test(value), "The company name is Mattel Infrastructures.");

export const companyProfileSchema = z.object({
  companyName,
  tagline: z.string().trim(),
  address: z.string().trim().min(1, "Enter the address."),
  phone: z.string().trim().min(1, "Enter a phone number."),
  email: z.string().trim().email("Enter a valid email address."),
  gstin: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9A-Za-z]{15}$/.test(value), "GSTIN is 15 characters."),
});

export const bankDetailsSchema = z.object({
  bankName: z.string().trim().min(1, "Enter the bank name."),
  accountName: z.string().trim().min(1, "Enter the account name."),
  accountNumber: z.string().trim().min(4, "Enter the account number."),
  ifscCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Enter an 11-character IFSC code."),
  upiId: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[^@\s]+@[^@\s]+$/.test(value), "Enter a UPI ID such as name@bank."),
});

export const unitTypesSchema = z.object({
  unitTypes: z.array(z.string().trim().min(1).max(24)).min(1, "Keep at least one measurement unit."),
});

export const invoiceDefaultsSchema = z.object({
  defaultTerms: z.string().trim(),
  defaultStationeryMode: z.boolean(),
});

export const brandingSchema = z.object({
  logoUrl: z.string().trim().optional(),
  signatureUrl: z.string().trim().optional(),
});

export function normalizeUnitTypes(unitList: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const unit of unitList) {
    const cleaned = unit.trim().replace(/\s+/g, " ");
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(cleaned);
  }
  return next;
}

export function companyNameError(name: string) {
  return companyProfileSchema.shape.companyName.safeParse(name).success
    ? null
    : "The company name is Mattel Infrastructures.";
}
