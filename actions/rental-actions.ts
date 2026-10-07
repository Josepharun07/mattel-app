"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assetAssignments, assets, projects, staff } from "@/db/schema";
import {
  calculateRentalCharge,
  calendarDay,
  isRentalOverdue,
  overdueDays,
  statusForBorrower,
  validateBorrower,
  type BorrowerType,
} from "@/lib/engines/rental-engine";
import { buildSampleRentals } from "@/lib/rentals/sample";
import type { RentalAssignment, RentalAsset, RentalDirectory } from "@/lib/rentals/types";

function money(amount: number) {
  return amount.toFixed(2);
}

function dayValue(value: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return calendarDay(value);
  }
  return String(value).slice(0, 10);
}

export async function getAssetCatalog(): Promise<RentalDirectory> {
  if (!process.env.DATABASE_URL) {
    return buildSampleRentals();
  }
  try {
    const [assetRows, assignmentRows, people, sites] = await Promise.all([
      db.select().from(assets).where(isNull(assets.deletedAt)),
      db.select().from(assetAssignments).where(isNull(assetAssignments.deletedAt)),
      db.select().from(staff).where(isNull(staff.deletedAt)),
      db.select().from(projects).where(isNull(projects.deletedAt)),
    ]);
    const staffName = new Map(people.map((person) => [person.id, person.fullName]));
    const projectName = new Map(sites.map((site) => [site.id, site.name || site.title]));
    const today = calendarDay();
    const history: RentalAssignment[] = assignmentRows.map((row) => {
      const asset = assetRows.find((item) => item.id === row.assetId);
      const expected = dayValue(row.expectedReturnDate) ?? today;
      const actual = dayValue(row.actualReturnDate);
      return {
        id: row.id,
        assetId: row.assetId,
        assetName: asset?.assetName ?? "Asset",
        borrowerType: row.borrowerType,
        staffId: row.staffId,
        staffName: row.staffId ? staffName.get(row.staffId) ?? null : null,
        projectId: row.projectId,
        projectName: row.projectId ? projectName.get(row.projectId) ?? null : null,
        externalBorrowerName: row.externalBorrowerName ?? row.externalName,
        externalBorrowerPhone: row.externalBorrowerPhone ?? row.externalPhone,
        externalIdDetails: row.externalIdDetails,
        issueDate: dayValue(row.issueDate) ?? today,
        expectedReturnDate: expected,
        actualReturnDate: actual,
        conditionOnIssue: row.conditionOnIssue,
        conditionOnReturn: row.conditionOnReturn,
        dailyRateApplied: Number(row.dailyRateApplied),
        totalRentCharged: Number(row.totalRentCharged),
        comments: row.comments ?? row.conditionNotes,
        overdue: isRentalOverdue(expected, actual, today),
        daysOverdue: overdueDays(expected, actual, today),
      };
    });
    const catalog: RentalAsset[] = assetRows.map((asset) => {
      const assignment = history.find((row) => row.assetId === asset.id && !row.actualReturnDate) ?? null;
      return {
        id: asset.id,
        assetName: asset.assetName,
        serialNumber: asset.serialNumber ?? asset.assetCode,
        category: asset.category,
        currentStatus: asset.currentStatus,
        defaultDailyRate: Number(asset.defaultDailyRate),
        assignment,
        overdue: assignment?.overdue ?? false,
        daysOverdue: assignment?.daysOverdue ?? 0,
      };
    });
    return {
      assets: catalog,
      history,
      staff: people.map((person) => ({ id: person.id, fullName: person.fullName })),
      projects: sites.map((site) => ({ id: site.id, name: site.name || site.title })),
      offline: false,
    };
  } catch {
    return buildSampleRentals();
  }
}

export async function getRentalHistory() {
  const directory = await getAssetCatalog();
  return directory.history;
}

export async function getOverdueRentalAlerts() {
  const directory = await getAssetCatalog();
  return directory.history.filter((row) => row.overdue);
}

const assignSchema = z.object({
  assetId: z.string().min(1),
  borrowerType: z.enum(["INTERNAL_WORKER", "EXTERNAL_RENTER"]),
  staffId: z.string().optional(),
  projectId: z.string().optional(),
  externalBorrowerName: z.string().optional(),
  externalBorrowerPhone: z.string().optional(),
  externalIdDetails: z.string().optional(),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conditionOnIssue: z.string().trim().min(1),
  dailyRateApplied: z.number().nonnegative(),
  comments: z.string().optional(),
});

export async function assignAsset(payload: z.infer<typeof assignSchema>) {
  const parsed = assignSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the asset, return date, and condition." };
  }
  const borrower = validateBorrower(parsed.data);
  if (!borrower.ok) {
    return { success: false as const, message: borrower.message };
  }
  if (parsed.data.expectedReturnDate < calendarDay()) {
    return { success: false as const, message: "The return deadline must be today or later." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This issue is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.assetId).success) {
    return { success: false as const, message: "Choose a saved asset." };
  }

  const status = statusForBorrower(parsed.data.borrowerType);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(assetAssignments).values({
        assetId: parsed.data.assetId,
        assigneeType: parsed.data.borrowerType,
        borrowerType: parsed.data.borrowerType,
        employeeId: parsed.data.staffId,
        staffId: parsed.data.staffId,
        projectId: parsed.data.projectId,
        externalName: parsed.data.externalBorrowerName,
        externalPhone: parsed.data.externalBorrowerPhone,
        externalBorrowerName: parsed.data.externalBorrowerName,
        externalBorrowerPhone: parsed.data.externalBorrowerPhone,
        externalIdDetails: parsed.data.externalIdDetails,
        issueDate: calendarDay(),
        expectedReturnDate: parsed.data.expectedReturnDate,
        conditionOnIssue: parsed.data.conditionOnIssue,
        conditionNotes: parsed.data.comments,
        dailyRateApplied: money(parsed.data.dailyRateApplied),
        comments: parsed.data.comments,
      });
      await tx
        .update(assets)
        .set({ currentStatus: status, status: "Assigned" })
        .where(and(eq(assets.id, parsed.data.assetId), isNull(assets.deletedAt)));
    });
    revalidatePath("/rentals");
    revalidatePath("/rentals/history");
    return { success: true as const, message: "Asset issued." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not issue the asset.";
    return { success: false as const, message };
  }
}

export async function returnAsset(assignmentId: string, returnCondition: string, returnNotes?: string) {
  if (!assignmentId || !returnCondition.trim()) {
    return { success: false as const, message: "Choose the assignment and the return condition." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This return is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(assignmentId).success) {
    return { success: false as const, message: "Choose a saved assignment." };
  }

  try {
    const [assignment] = await db
      .select()
      .from(assetAssignments)
      .where(and(eq(assetAssignments.id, assignmentId), isNull(assetAssignments.deletedAt)));
    if (!assignment || assignment.actualReturnDate) {
      return { success: false as const, message: "That assignment is already closed." };
    }
    const returnedOn = calendarDay();
    const charge = calculateRentalCharge(dayValue(assignment.issueDate) ?? returnedOn, returnedOn, Number(assignment.dailyRateApplied));
    await db.transaction(async (tx) => {
      await tx
        .update(assetAssignments)
        .set({
          actualReturnDate: returnedOn,
          conditionOnReturn: returnCondition.trim(),
          totalRentCharged: money(charge.totalRentCharged),
          comments: returnNotes?.trim() || assignment.comments,
        })
        .where(eq(assetAssignments.id, assignment.id));
      await tx
        .update(assets)
        .set({ currentStatus: "AVAILABLE", status: "Available" })
        .where(eq(assets.id, assignment.assetId));
    });
    revalidatePath("/rentals");
    revalidatePath("/rentals/history");
    return { success: true as const, message: "Asset returned.", totalRentCharged: charge.totalRentCharged };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not return the asset.";
    return { success: false as const, message };
  }
}

export type { BorrowerType };
