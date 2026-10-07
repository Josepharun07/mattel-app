"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projects, staff, subcontractDraws, subcontracts } from "@/db/schema";
import {
  assessDraw,
  payoutProgress,
  remainingContractBalance,
  statusAfterDraw,
  teamNames,
  totalAdvancesDrawn,
  validateLead,
  type ContractStatus,
  type LeadPersonType,
} from "@/lib/engines/subcontract-engine";
import { buildSampleSubcontracts } from "@/lib/subcontracts/sample";
import type { SubcontractDirectory, SubcontractDraw, SubcontractRecord, TeamMember } from "@/lib/subcontracts/types";
import { roundMoney } from "@/lib/money";

function money(amount: number) {
  return roundMoney(amount).toFixed(2);
}

function dayValue(value: Date | string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function asLead(value: string): LeadPersonType {
  return value === "INTERNAL_WORKER" || value === "INTERNAL_EMPLOYEE" ? "INTERNAL_WORKER" : "EXTERNAL_CONTRACTOR";
}

function asMembers(value: unknown): TeamMember[] {
  if (!Array.isArray(value)) {
    return teamNames(value).map((name) => ({ staffId: null, name }));
  }
  return value.flatMap((member) => {
    if (typeof member === "string" && member.trim()) {
      return [{ staffId: null, name: member.trim() }];
    }
    if (member && typeof member === "object" && "name" in member) {
      const name = String((member as { name: unknown }).name).trim();
      const staffId = "staffId" in member && (member as { staffId?: unknown }).staffId
        ? String((member as { staffId: unknown }).staffId)
        : null;
      return name ? [{ staffId, name }] : [];
    }
    return [];
  });
}

function summarize(input: Omit<SubcontractRecord, "totalAdvances" | "remainingBalance" | "progress">): SubcontractRecord {
  const totalAdvances = totalAdvancesDrawn(input.draws);
  const remainingBalance = remainingContractBalance(input.totalContractAmount, totalAdvances);
  return {
    ...input,
    totalAdvances,
    remainingBalance,
    progress: payoutProgress(input.totalContractAmount, totalAdvances),
  };
}

export async function getSubcontracts(projectId?: string): Promise<SubcontractDirectory> {
  if (!process.env.DATABASE_URL) {
    const sample = buildSampleSubcontracts();
    return projectId ? { ...sample, contracts: sample.contracts.filter((row) => row.projectId === projectId) } : sample;
  }

  try {
    const [contractRows, drawRows, people, sites] = await Promise.all([
      db.select().from(subcontracts).where(isNull(subcontracts.deletedAt)),
      db.select().from(subcontractDraws).where(isNull(subcontractDraws.deletedAt)),
      db.select().from(staff).where(isNull(staff.deletedAt)),
      db.select().from(projects).where(isNull(projects.deletedAt)),
    ]);
    const staffName = new Map(people.map((person) => [person.id, person.fullName]));
    const projectName = new Map(sites.map((site) => [site.id, site.name || site.title]));
    const drawsByContract = new Map<string, SubcontractDraw[]>();
    for (const draw of drawRows) {
      const list = drawsByContract.get(draw.subcontractId) ?? [];
      list.push({
        id: draw.id,
        subcontractId: draw.subcontractId,
        drawDate: dayValue(draw.drawDate),
        amountPaid: Number(draw.amountPaid),
        paymentMode: draw.paymentMode,
        referenceNumber: draw.referenceNumber,
        notes: draw.notes,
      });
      drawsByContract.set(draw.subcontractId, list);
    }
    const contracts = contractRows
      .filter((row) => !projectId || row.projectId === projectId)
      .map((row) => {
        const leadPersonType = asLead(row.leadPersonType);
        const leadStaffId = row.leadStaffId ?? row.leadEmployeeId;
        return summarize({
          id: row.id,
          projectId: row.projectId,
          projectName: projectName.get(row.projectId) ?? "Project",
          title: row.title,
          leadPersonType,
          leadStaffId,
          leadName: leadPersonType === "INTERNAL_WORKER"
            ? staffName.get(leadStaffId ?? "") ?? "Internal worker"
            : row.externalLeadName ?? "External contractor",
          leadPhone: row.externalLeadPhone,
          teamMembers: asMembers(row.teamMembers),
          totalContractAmount: Number(row.totalContractAmount),
          status: row.status,
          draws: drawsByContract.get(row.id) ?? [],
          createdAt: row.createdAt.toISOString(),
        });
      });
    return {
      offline: false,
      contracts,
      staff: people.map((person) => ({ id: person.id, fullName: person.fullName })),
      projects: sites.map((site) => ({ id: site.id, name: site.name || site.title })),
    };
  } catch {
    return buildSampleSubcontracts();
  }
}

export async function getSubcontractDetails(subcontractId: string) {
  const directory = await getSubcontracts();
  return directory.contracts.find((row) => row.id === subcontractId) ?? null;
}

const teamSchema = z.object({
  staffId: z.string().nullable().optional(),
  name: z.string().trim().min(1),
});

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1),
  leadPersonType: z.enum(["INTERNAL_WORKER", "EXTERNAL_CONTRACTOR"]),
  leadStaffId: z.string().optional(),
  externalLeadName: z.string().optional(),
  externalLeadPhone: z.string().optional(),
  teamMembers: z.array(teamSchema).default([]),
  totalContractAmount: z.number().positive(),
});

export async function createSubcontract(payload: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the project, title, lead, and contract amount." };
  }
  const lead = validateLead(parsed.data);
  if (!lead.ok) {
    return { success: false as const, message: lead.message };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This contract is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.projectId).success) {
    return { success: false as const, message: "Choose a saved project." };
  }

  try {
    const [created] = await db
      .insert(subcontracts)
      .values({
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        leadPersonType: parsed.data.leadPersonType,
        leadEmployeeId: parsed.data.leadStaffId,
        leadStaffId: parsed.data.leadStaffId,
        externalLeadName: parsed.data.externalLeadName,
        externalLeadPhone: parsed.data.externalLeadPhone,
        teamMembers: parsed.data.teamMembers.map((member) => ({ staffId: member.staffId ?? null, name: member.name })),
        totalContractAmount: money(parsed.data.totalContractAmount),
        status: "ACTIVE",
      })
      .returning({ id: subcontracts.id });
    revalidatePath("/subcontracts");
    return { success: true as const, message: "Subcontract created.", id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the subcontract.";
    return { success: false as const, message };
  }
}

const drawSchema = z.object({
  subcontractId: z.string().min(1),
  amountPaid: z.number().positive(),
  paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function issueSubcontractDraw(payload: z.infer<typeof drawSchema>) {
  const parsed = drawSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, message: "Enter the advance amount and payment mode." };
  }
  if (!process.env.DATABASE_URL) {
    return {
      success: false as const,
      offline: true,
      message: "DATABASE_URL is not configured. This draw is kept in this session.",
    };
  }
  if (!z.uuid().safeParse(parsed.data.subcontractId).success) {
    return { success: false as const, message: "Choose a saved subcontract." };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(subcontracts)
        .where(and(eq(subcontracts.id, parsed.data.subcontractId), isNull(subcontracts.deletedAt)));
      if (!contract) {
        return { ok: false as const, message: "That subcontract was not found." };
      }
      if (contract.status === "TERMINATED") {
        return { ok: false as const, message: "Terminated contracts cannot take further advances." };
      }
      const draws = await tx
        .select({ amountPaid: subcontractDraws.amountPaid })
        .from(subcontractDraws)
        .where(and(eq(subcontractDraws.subcontractId, contract.id), isNull(subcontractDraws.deletedAt)));
      const remaining = remainingContractBalance(
        Number(contract.totalContractAmount),
        totalAdvancesDrawn(draws.map((row) => ({ amountPaid: Number(row.amountPaid) }))),
      );
      const guard = assessDraw(remaining, parsed.data.amountPaid);
      if (!guard.ok) {
        return guard;
      }
      const [draw] = await tx
        .insert(subcontractDraws)
        .values({
          subcontractId: contract.id,
          amountPaid: money(parsed.data.amountPaid),
          paymentMode: parsed.data.paymentMode,
          referenceNumber: parsed.data.referenceNumber?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
        })
        .returning({ id: subcontractDraws.id });
      const nextStatus = statusAfterDraw(contract.status, guard.remainingAfter);
      if (nextStatus !== contract.status) {
        await tx.update(subcontracts).set({ status: nextStatus }).where(eq(subcontracts.id, contract.id));
      }
      return { ok: true as const, id: draw.id, status: nextStatus };
    });
    if (!created.ok) {
      return { success: false as const, message: created.message };
    }
    revalidatePath("/subcontracts");
    revalidatePath(`/subcontracts/${parsed.data.subcontractId}`);
    return { success: true as const, message: "Advance draw recorded.", id: created.id, status: created.status as ContractStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the advance.";
    return { success: false as const, message };
  }
}
