import type { ContractStatus, LeadPersonType } from "@/lib/engines/subcontract-engine";

export type TeamMember = { staffId: string | null; name: string };

export type SubcontractDraw = {
  id: string;
  subcontractId: string;
  drawDate: string;
  amountPaid: number;
  paymentMode: string;
  referenceNumber: string | null;
  notes: string | null;
};

export type SubcontractRecord = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  leadPersonType: LeadPersonType;
  leadStaffId: string | null;
  leadName: string;
  leadPhone: string | null;
  teamMembers: TeamMember[];
  totalContractAmount: number;
  status: ContractStatus;
  draws: SubcontractDraw[];
  totalAdvances: number;
  remainingBalance: number;
  progress: number;
  createdAt: string;
};

export type SubcontractDirectory = {
  contracts: SubcontractRecord[];
  staff: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  offline: boolean;
};
