import { roundMoney } from "@/lib/money";

export type LeadPersonType = "INTERNAL_WORKER" | "EXTERNAL_CONTRACTOR";
export type ContractStatus = "ACTIVE" | "COMPLETED" | "TERMINATED";
export type DrawPaymentMode = "CASH" | "UPI" | "BANK_TRANSFER";

export function totalAdvancesDrawn(draws: { amountPaid: number }[]) {
  return roundMoney(
    draws.reduce((sum, draw) => sum + (Number.isFinite(draw.amountPaid) ? draw.amountPaid : 0), 0),
  );
}

export function remainingContractBalance(totalContractAmount: number, totalAdvances: number) {
  return roundMoney(totalContractAmount - totalAdvances);
}

export function payoutProgress(totalContractAmount: number, totalAdvances: number) {
  if (totalContractAmount <= 0) {
    return totalAdvances > 0 ? 100 : 0;
  }
  return Math.min(100, roundMoney((totalAdvances / totalContractAmount) * 100));
}

export function assessDraw(remainingBalance: number, amountPaid: number) {
  const amount = roundMoney(amountPaid);
  const remaining = roundMoney(remainingBalance);
  if (amount <= 0) {
    return { ok: false as const, message: "Enter an advance greater than zero." };
  }
  if (amount > remaining) {
    return {
      ok: false as const,
      message: "That advance is larger than the remaining contract balance.",
    };
  }
  return { ok: true as const, remainingAfter: roundMoney(remaining - amount) };
}

export function statusAfterDraw(current: ContractStatus, remainingAfter: number): ContractStatus {
  if (current === "TERMINATED") {
    return "TERMINATED";
  }
  if (remainingAfter <= 0) {
    return "COMPLETED";
  }
  return current === "COMPLETED" ? "COMPLETED" : "ACTIVE";
}

export function validateLead(input: {
  leadPersonType: LeadPersonType;
  leadStaffId?: string | null;
  externalLeadName?: string | null;
  externalLeadPhone?: string | null;
}) {
  if (input.leadPersonType === "INTERNAL_WORKER") {
    if (!input.leadStaffId) {
      return { ok: false as const, message: "Choose an internal team lead." };
    }
    return { ok: true as const };
  }
  if (!input.externalLeadName?.trim() || !input.externalLeadPhone?.trim()) {
    return { ok: false as const, message: "Enter the external contractor's name and phone." };
  }
  return { ok: true as const };
}

export function teamNames(members: unknown): string[] {
  if (!Array.isArray(members)) {
    return [];
  }
  return members
    .map((member) => {
      if (typeof member === "string") {
        return member.trim();
      }
      if (member && typeof member === "object" && "name" in member) {
        return String((member as { name: unknown }).name).trim();
      }
      return "";
    })
    .filter(Boolean);
}
