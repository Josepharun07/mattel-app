import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobRoles, staff, staffPhones, staffRoleAssignments } from "@/db/schema";
import type { StaffDirectory, StaffRecord } from "@/lib/staff/directory";

function money(value: number) {
  return value.toFixed(2);
}

export async function loadStaffDirectory(): Promise<StaffDirectory> {
  const [roles, people, phones, links] = await Promise.all([
    db.select().from(jobRoles),
    db.select().from(staff),
    db.select().from(staffPhones),
    db.select().from(staffRoleAssignments),
  ]);
  return {
    roles: roles.map((role) => ({ id: role.id, name: role.name, builtIn: role.builtIn })),
    staff: people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      address: person.address,
      phones: phones
        .filter((phone) => phone.staffId === person.id)
        .map((phone) => ({ id: phone.id, label: phone.label, number: phone.phoneNumber })),
      email: person.email,
      panNumber: person.panNumber,
      aadhaarNumber: person.aadhaarNumber,
      upiId: person.upiId,
      bankName: person.bankName,
      accountNumber: person.accountNumber,
      ifscCode: person.ifscCode,
      emergencyName: person.emergencyName,
      emergencyPhone: person.emergencyPhone,
      emergencyRelation: person.emergencyRelation,
      dailyBaseRate: Number(person.dailyBaseRate),
      hourlyRate: Number(person.hourlyRate),
      joiningDate: person.joiningDate ?? "",
      bloodGroup: person.bloodGroup,
      notes: person.notes,
      roleIds: links.filter((link) => link.staffId === person.id).map((link) => link.roleId),
      deletedAt: person.deletedAt ? person.deletedAt.toISOString() : null,
    })),
  };
}

export async function upsertStaff(record: StaffRecord) {
  const values = {
    fullName: record.fullName,
    role: record.roleIds.length ? record.roleIds.join(",") : "Unassigned",
    hourlyRate: money(record.hourlyRate),
    dailyBaseRate: money(record.dailyBaseRate),
    address: record.address,
    email: record.email,
    panNumber: record.panNumber,
    aadhaarNumber: record.aadhaarNumber,
    upiId: record.upiId,
    bankName: record.bankName,
    accountNumber: record.accountNumber,
    ifscCode: record.ifscCode,
    emergencyName: record.emergencyName,
    emergencyPhone: record.emergencyPhone,
    emergencyRelation: record.emergencyRelation,
    joiningDate: record.joiningDate || null,
    bloodGroup: record.bloodGroup,
    notes: record.notes,
  };
  const [existing] = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, record.id)).limit(1);
  if (existing) {
    await db.update(staff).set(values).where(eq(staff.id, record.id));
  } else {
    await db.insert(staff).values({ id: record.id, ...values });
  }
  await db.delete(staffPhones).where(eq(staffPhones.staffId, record.id));
  if (record.phones.length) {
    await db.insert(staffPhones).values(
      record.phones.map((phone) => ({
        id: phone.id,
        staffId: record.id,
        label: phone.label,
        phoneNumber: phone.number,
      })),
    );
  }
}

export async function replaceStaffRoles(staffId: string, roleIds: string[]) {
  await db.delete(staffRoleAssignments).where(eq(staffRoleAssignments.staffId, staffId));
  if (roleIds.length) {
    await db.insert(staffRoleAssignments).values(roleIds.map((roleId) => ({ staffId, roleId })));
  }
  const assigned = (await db.select({ id: jobRoles.id, name: jobRoles.name }).from(jobRoles)).filter((role) =>
    roleIds.includes(role.id),
  );
  await db.update(staff).set({ role: assigned.map((role) => role.name).join(", ") || "Unassigned" }).where(eq(staff.id, staffId));
}
