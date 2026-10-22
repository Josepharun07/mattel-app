import { describe, expect, it } from "vitest";
import {
  assignStaffRoles,
  canAssignStaffRoles,
  createJobRole,
  removeJobRole,
  saveStaffMember,
  seedDirectory,
  seedRoles,
} from "@/lib/staff/directory";

const blank = {
  fullName: "Anil",
  address: "Aluva",
  phones: [
    { id: "p1", label: "Mobile", number: "9999999999" },
    { id: "p2", label: "Home", number: "   " },
  ],
  email: "",
  panNumber: "abcde1234f",
  aadhaarNumber: "1234 5678 9012",
  upiId: "anil@upi",
  bankName: "State Bank of India",
  accountNumber: "123",
  ifscCode: "sbin0001234",
  emergencyName: "Meera",
  emergencyPhone: "9888888888",
  emergencyRelation: "Spouse",
  dailyBaseRate: 800,
  hourlyRate: 100,
  joiningDate: "2026-01-01",
  bloodGroup: "O+",
  notes: "",
};

describe("staff directory", () => {
  it("starts with the site roles", () => {
    expect(seedRoles().map((role) => role.name)).toEqual([
      "Manager",
      "Supervisor",
      "Mason",
      "Helper",
      "Operator",
      "Driver",
      "Heavy vehicle driver",
      "Owner",
      "Admin",
    ]);
  });

  it("keeps optional phones and normalises identity fields", () => {
    const saved = saveStaffMember(seedDirectory(), blank);
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    expect(saved.record.phones).toHaveLength(1);
    expect(saved.record.panNumber).toBe("ABCDE1234F");
    expect(saved.record.aadhaarNumber).toBe("123456789012");
    expect(saved.record.ifscCode).toBe("SBIN0001234");
    expect(saved.record.roleIds).toEqual([]);
  });

  it("refuses a bad PAN", () => {
    const saved = saveStaffMember(seedDirectory(), { ...blank, panNumber: "123" });
    expect(saved.ok).toBe(false);
  });

  it("lets an owner assign more than one role and refuses a manager", () => {
    const directory = seedDirectory();
    const person = directory.staff[0];
    const mason = directory.roles.find((role) => role.name === "Mason");
    const helper = directory.roles.find((role) => role.name === "Helper");
    expect(mason && helper).toBeTruthy();
    const assigned = assignStaffRoles(directory, person.id, [mason!.id, helper!.id], "OWNER");
    expect(assigned.ok).toBe(true);
    if (assigned.ok) {
      expect(assigned.directory.staff.find((item) => item.id === person.id)?.roleIds).toEqual([mason!.id, helper!.id]);
    }
    expect(assignStaffRoles(directory, person.id, [mason!.id], "MANAGER").ok).toBe(false);
    expect(canAssignStaffRoles("SUPER_ADMIN")).toBe(true);
    expect(canAssignStaffRoles("OPERATOR")).toBe(false);
  });

  it("lets a super admin add a custom role and keeps built-in roles", () => {
    const created = createJobRole(seedDirectory(), "Store keeper", "SUPER_ADMIN");
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(createJobRole(created.directory, "store keeper", "SUPER_ADMIN").ok).toBe(false);
    expect(createJobRole(created.directory, "Welder", "OPERATOR").ok).toBe(false);
    const builtIn = created.directory.roles.find((role) => role.name === "Mason");
    expect(removeJobRole(created.directory, builtIn!.id, "OWNER").ok).toBe(false);
    const removed = removeJobRole(created.directory, created.role.id, "OWNER");
    expect(removed.ok).toBe(true);
  });
});
