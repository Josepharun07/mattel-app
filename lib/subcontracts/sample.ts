import { addDays, format } from "date-fns";
import {
  payoutProgress,
  remainingContractBalance,
  statusAfterDraw,
  totalAdvancesDrawn,
  type ContractStatus,
} from "@/lib/engines/subcontract-engine";
import type { SubcontractDirectory, SubcontractDraw, SubcontractRecord, TeamMember } from "@/lib/subcontracts/types";

function day(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function contract(input: Omit<SubcontractRecord, "totalAdvances" | "remainingBalance" | "progress" | "status"> & { status?: ContractStatus }): SubcontractRecord {
  const totalAdvances = totalAdvancesDrawn(input.draws);
  const remainingBalance = remainingContractBalance(input.totalContractAmount, totalAdvances);
  return {
    ...input,
    totalAdvances,
    remainingBalance,
    progress: payoutProgress(input.totalContractAmount, totalAdvances),
    status: input.status ?? statusAfterDraw("ACTIVE", remainingBalance),
  };
}

function draw(id: string, subcontractId: string, drawDate: string, amountPaid: number, paymentMode: string, notes: string): SubcontractDraw {
  return { id, subcontractId, drawDate, amountPaid, paymentMode, referenceNumber: null, notes };
}

export function buildSampleSubcontracts(today = new Date()): SubcontractDirectory {
  const masonryDraws = [draw("draw-masonry-1", "sub-masonry", day(addDays(today, -12)), 50000, "BANK_TRANSFER", "First masonry advance")];
  const electricalDraws = [
    draw("draw-electrical-1", "sub-electrical", day(addDays(today, -20)), 40000, "UPI", "Conduit advance"),
    draw("draw-electrical-2", "sub-electrical", day(addDays(today, -6)), 20000, "CASH", "Wiring materials"),
  ];
  const plasterDraws = [draw("draw-plaster-1", "sub-plaster", day(addDays(today, -30)), 80000, "BANK_TRANSFER", "Final plaster settlement")];
  const team = (names: string[]): TeamMember[] => names.map((name) => ({ staffId: null, name }));

  return {
    offline: true,
    staff: [
      { id: "staff-rajesh", fullName: "Rajesh Kumar" },
      { id: "staff-suresh", fullName: "Suresh P." },
    ],
    projects: [{ id: "project-abc-site", name: "Compound Wall & Yard Fill" }],
    contracts: [
      contract({
        id: "sub-masonry",
        projectId: "project-abc-site",
        projectName: "Compound Wall & Yard Fill",
        title: "Masonry Work - Block A",
        leadPersonType: "EXTERNAL_CONTRACTOR",
        leadStaffId: null,
        leadName: "Anil Crew",
        leadPhone: "9800000099",
        teamMembers: team(["Ravi", "Manoj"]),
        totalContractAmount: 250000,
        draws: masonryDraws,
        createdAt: new Date(addDays(today, -40)).toISOString(),
      }),
      contract({
        id: "sub-electrical",
        projectId: "project-abc-site",
        projectName: "Compound Wall & Yard Fill",
        title: "Electrical Piping & Wiring Phase 1",
        leadPersonType: "INTERNAL_WORKER",
        leadStaffId: "staff-rajesh",
        leadName: "Rajesh Kumar",
        leadPhone: null,
        teamMembers: [{ staffId: "staff-suresh", name: "Suresh P." }],
        totalContractAmount: 120000,
        draws: electricalDraws,
        createdAt: new Date(addDays(today, -25)).toISOString(),
      }),
      contract({
        id: "sub-plaster",
        projectId: "project-abc-site",
        projectName: "Compound Wall & Yard Fill",
        title: "Plaster Finish - Yard Wall",
        leadPersonType: "EXTERNAL_CONTRACTOR",
        leadStaffId: null,
        leadName: "Kerala Plaster Co",
        leadPhone: "9847002200",
        teamMembers: team(["Iqbal"]),
        totalContractAmount: 80000,
        draws: plasterDraws,
        createdAt: new Date(addDays(today, -45)).toISOString(),
      }),
    ],
  };
}
