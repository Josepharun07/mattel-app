import { differenceInDays, parseISO } from "date-fns";
import { roundMoney } from "@/lib/money";

export type AssetStatus = "AVAILABLE" | "RENTED_INTERNAL" | "RENTED_EXTERNAL" | "MAINTENANCE";
export type BorrowerType = "INTERNAL_WORKER" | "EXTERNAL_RENTER";

export function calendarDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isRentalOverdue(expectedReturnDate: string, actualReturnDate: string | null, today = calendarDay()) {
  return !actualReturnDate && today > expectedReturnDate;
}

export function overdueDays(expectedReturnDate: string, actualReturnDate: string | null, today = calendarDay()) {
  if (!isRentalOverdue(expectedReturnDate, actualReturnDate, today)) {
    return 0;
  }
  return Math.max(0, differenceInDays(parseISO(today), parseISO(expectedReturnDate)));
}

export function calculateRentalCharge(issueDate: string, returnDate: string, dailyRate: number) {
  const daysRented = Math.max(1, differenceInDays(parseISO(returnDate), parseISO(issueDate)));
  return {
    daysRented,
    totalRentCharged: roundMoney(daysRented * dailyRate),
  };
}

export function validateBorrower(input: {
  borrowerType: BorrowerType;
  staffId?: string | null;
  externalBorrowerName?: string | null;
  externalBorrowerPhone?: string | null;
}) {
  if (input.borrowerType === "INTERNAL_WORKER") {
    if (!input.staffId) {
      return { ok: false as const, message: "Choose an internal worker." };
    }
    return { ok: true as const };
  }
  if (!input.externalBorrowerName?.trim() || !input.externalBorrowerPhone?.trim()) {
    return { ok: false as const, message: "Enter the external renter's name and phone." };
  }
  return { ok: true as const };
}

export function statusForBorrower(borrowerType: BorrowerType): AssetStatus {
  return borrowerType === "INTERNAL_WORKER" ? "RENTED_INTERNAL" : "RENTED_EXTERNAL";
}
