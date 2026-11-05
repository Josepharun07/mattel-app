"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobRoles } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/current";
import { loadStaffDirectory, replaceStaffRoles, upsertStaff } from "@/lib/persistence/staff-db";
import {
  assignStaffRoles,
  createJobRole,
  removeJobRole,
  saveStaffMember,
  seedRoles,
  type StaffDraft,
} from "@/lib/staff/directory";

async function actor() {
  const session = await getCurrentSession();
  if (!session || session.kind !== "staff" || !session.role) {
    return null;
  }
  return { ...session, role: session.role };
}

export async function getStaffDirectory() {
  const session = await actor();
  if (!session) {
    return { roles: seedRoles(), staff: [] };
  }
  return loadStaffDirectory();
}

export async function saveStaffAction(draft: StaffDraft, id?: string) {
  const session = await actor();
  if (!session) {
    return { ok: false as const, message: "Sign in required." };
  }
  const result = saveStaffMember(await loadStaffDirectory(), draft, id);
  if (!result.ok) {
    return result;
  }
  await upsertStaff(result.record);
  revalidatePath("/staff");
  return { ok: true as const, record: result.record, message: "Staff record saved." };
}

export async function assignRolesAction(staffId: string, roleIds: string[]) {
  const session = await actor();
  if (!session) {
    return { ok: false as const, message: "Sign in required." };
  }
  const result = assignStaffRoles(await loadStaffDirectory(), staffId, roleIds, session.role);
  if (!result.ok) {
    return result;
  }
  const person = result.directory.staff.find((item) => item.id === staffId);
  await replaceStaffRoles(staffId, person?.roleIds ?? []);
  revalidatePath("/staff");
  revalidatePath("/admin/roles");
  return { ok: true as const, message: "Roles saved." };
}

export async function createRoleAction(name: string) {
  const session = await actor();
  if (!session) {
    return { ok: false as const, message: "Sign in required." };
  }
  const result = createJobRole(await loadStaffDirectory(), name, session.role);
  if (!result.ok) {
    return result;
  }
  await db.insert(jobRoles).values({ id: result.role.id, name: result.role.name, builtIn: false });
  revalidatePath("/admin/roles");
  revalidatePath("/staff");
  return { ok: true as const, role: result.role, message: `${result.role.name} added.` };
}

export async function deleteRoleAction(roleId: string) {
  const session = await actor();
  if (!session) {
    return { ok: false as const, message: "Sign in required." };
  }
  const result = removeJobRole(await loadStaffDirectory(), roleId, session.role);
  if (!result.ok) {
    return result;
  }
  await db.delete(jobRoles).where(eq(jobRoles.id, roleId));
  revalidatePath("/admin/roles");
  revalidatePath("/staff");
  return { ok: true as const, message: "Role removed." };
}
