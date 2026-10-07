import { addDays, format } from "date-fns";
import { calculateRentalCharge, isRentalOverdue, overdueDays } from "@/lib/engines/rental-engine";
import type { RentalAssignment, RentalDirectory } from "@/lib/rentals/types";

function day(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function withOverdue(row: Omit<RentalAssignment, "overdue" | "daysOverdue">, today: string): RentalAssignment {
  return {
    ...row,
    overdue: isRentalOverdue(row.expectedReturnDate, row.actualReturnDate, today),
    daysOverdue: overdueDays(row.expectedReturnDate, row.actualReturnDate, today),
  };
}

export function buildSampleRentals(today = new Date()): RentalDirectory {
  const current = day(today);
  const issued = day(addDays(today, -6));
  const duePast = day(addDays(today, -3));
  const dueFuture = day(addDays(today, 5));
  const returnedIssue = day(addDays(today, -10));
  const returnedOn = day(addDays(today, -7));
  const closed = calculateRentalCharge(returnedIssue, returnedOn, 800);
  const historyBase: Omit<RentalAssignment, "overdue" | "daysOverdue">[] = [
    {
      id: "assign-hammer",
      assetId: "asset-hammer",
      assetName: "Demolition Hammer 15kg",
      borrowerType: "EXTERNAL_RENTER",
      staffId: null,
      staffName: null,
      projectId: "project-abc-site",
      projectName: "Compound Wall & Yard Fill",
      externalBorrowerName: "Kumar Rentals",
      externalBorrowerPhone: "9847001122",
      externalIdDetails: "KL-ID-4412",
      issueDate: issued,
      expectedReturnDate: duePast,
      actualReturnDate: null,
      conditionOnIssue: "GOOD",
      conditionOnReturn: null,
      dailyRateApplied: 400,
      totalRentCharged: 0,
      comments: "Breaker bit included",
    },
    {
      id: "assign-scaffold",
      assetId: "asset-scaffold",
      assetName: "Scaffolding Set",
      borrowerType: "INTERNAL_WORKER",
      staffId: "staff-rajesh",
      staffName: "Rajesh Kumar",
      projectId: "project-abc-site",
      projectName: "Compound Wall & Yard Fill",
      externalBorrowerName: null,
      externalBorrowerPhone: null,
      externalIdDetails: null,
      issueDate: day(addDays(today, -1)),
      expectedReturnDate: dueFuture,
      actualReturnDate: null,
      conditionOnIssue: "GOOD",
      conditionOnReturn: null,
      dailyRateApplied: 0,
      totalRentCharged: 0,
      comments: "Yard elevation",
    },
    {
      id: "assign-compactor",
      assetId: "asset-compactor",
      assetName: "Plate Compactor",
      borrowerType: "EXTERNAL_RENTER",
      staffId: null,
      staffName: null,
      projectId: null,
      projectName: null,
      externalBorrowerName: "Site Hire Co",
      externalBorrowerPhone: "9800000099",
      externalIdDetails: "KL-ID-1008",
      issueDate: returnedIssue,
      expectedReturnDate: returnedOn,
      actualReturnDate: returnedOn,
      conditionOnIssue: "GOOD",
      conditionOnReturn: "GOOD",
      dailyRateApplied: 800,
      totalRentCharged: closed.totalRentCharged,
      comments: "Returned on time",
    },
  ];
  const history = historyBase.map((row) => withOverdue(row, current));
  const open = (id: string) => history.find((row) => row.assetId === id && !row.actualReturnDate) ?? null;

  return {
    offline: true,
    staff: [
      { id: "staff-rajesh", fullName: "Rajesh Kumar" },
      { id: "staff-suresh", fullName: "Suresh P." },
    ],
    projects: [{ id: "project-abc-site", name: "Compound Wall & Yard Fill" }],
    history,
    assets: [
      {
        id: "asset-mixer",
        assetName: "Concrete Mixer 10/7",
        serialNumber: "CM-10",
        category: "HEAVY_MACHINERY",
        currentStatus: "AVAILABLE",
        defaultDailyRate: 1500,
        assignment: null,
        overdue: false,
        daysOverdue: 0,
      },
      {
        id: "asset-hammer",
        assetName: "Demolition Hammer 15kg",
        serialNumber: "DH-15",
        category: "POWER_TOOLS",
        currentStatus: "RENTED_EXTERNAL",
        defaultDailyRate: 400,
        assignment: open("asset-hammer"),
        overdue: open("asset-hammer")?.overdue ?? false,
        daysOverdue: open("asset-hammer")?.daysOverdue ?? 0,
      },
      {
        id: "asset-scaffold",
        assetName: "Scaffolding Set",
        serialNumber: "SC-02",
        category: "SCAFFOLDING",
        currentStatus: "RENTED_INTERNAL",
        defaultDailyRate: 200,
        assignment: open("asset-scaffold"),
        overdue: false,
        daysOverdue: 0,
      },
      {
        id: "asset-compactor",
        assetName: "Plate Compactor",
        serialNumber: "PC-01",
        category: "POWER_TOOLS",
        currentStatus: "AVAILABLE",
        defaultDailyRate: 800,
        assignment: null,
        overdue: false,
        daysOverdue: 0,
      },
    ],
  };
}
