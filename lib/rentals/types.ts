import type { AssetStatus, BorrowerType } from "@/lib/engines/rental-engine";

export type RentalAssignment = {
  id: string;
  assetId: string;
  assetName: string;
  borrowerType: BorrowerType;
  staffId: string | null;
  staffName: string | null;
  projectId: string | null;
  projectName: string | null;
  externalBorrowerName: string | null;
  externalBorrowerPhone: string | null;
  externalIdDetails: string | null;
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  conditionOnIssue: string;
  conditionOnReturn: string | null;
  dailyRateApplied: number;
  totalRentCharged: number;
  comments: string | null;
  overdue: boolean;
  daysOverdue: number;
};

export type RentalAsset = {
  id: string;
  assetName: string;
  serialNumber: string | null;
  category: string;
  currentStatus: AssetStatus;
  defaultDailyRate: number;
  assignment: RentalAssignment | null;
  overdue: boolean;
  daysOverdue: number;
};

export type RentalDirectory = {
  assets: RentalAsset[];
  history: RentalAssignment[];
  staff: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  offline: boolean;
};
