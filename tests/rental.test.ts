import { describe, expect, it } from "vitest";
import { calculateRentalCharge, isRentalOverdue, overdueDays, validateBorrower } from "@/lib/engines/rental-engine";

describe("rental engine", () => {
  it("flags an open rental past the deadline and charges at least one day", () => {
    expect(isRentalOverdue("2026-10-04", null, "2026-10-07")).toBe(true);
    expect(isRentalOverdue("2026-10-07", null, "2026-10-07")).toBe(false);
    expect(overdueDays("2026-10-04", null, "2026-10-07")).toBe(3);
    expect(calculateRentalCharge("2026-10-01", "2026-10-07", 400)).toEqual({
      daysRented: 6,
      totalRentCharged: 2400,
    });
    expect(calculateRentalCharge("2026-10-07", "2026-10-07", 400).daysRented).toBe(1);
  });

  it("requires a worker for internal issue and a name plus phone for external issue", () => {
    expect(validateBorrower({ borrowerType: "INTERNAL_WORKER", staffId: null }).ok).toBe(false);
    expect(validateBorrower({ borrowerType: "INTERNAL_WORKER", staffId: "staff-rajesh" }).ok).toBe(true);
    expect(validateBorrower({ borrowerType: "EXTERNAL_RENTER", externalBorrowerName: "Kumar", externalBorrowerPhone: "" }).ok).toBe(false);
    expect(
      validateBorrower({
        borrowerType: "EXTERNAL_RENTER",
        externalBorrowerName: "Kumar Rentals",
        externalBorrowerPhone: "9847001122",
      }).ok,
    ).toBe(true);
  });
});
