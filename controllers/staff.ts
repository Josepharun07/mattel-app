"use server";

import { allowed } from "@/lib/auth/access";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, jobRoles } from "@/db/schema";
import { allPageGrants, isEmployeeRole, roleHasFullOffice } from "@/lib/auth/pages";
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
  if (!(await allowed("staff.read"))) return { roles: seedRoles(), staff: [] };
  const session = await actor();
  if (!session) {
    return { roles: seedRoles(), staff: [] };
  }
  return loadStaffDirectory();
}

export async function getEmployeeForProfile(id: string) {
  const session = await getCurrentSession();
  if (session?.staffId !== id && !(await allowed("staff.read"))) {
    return null;
  }
  const directory = await loadStaffDirectory();
  return {
    directory,
    person: directory.staff.find((item) => item.id === id && !item.deletedAt) ?? null,
  };
}

export async function saveStaffAction(draft: StaffDraft, id?: string, inform?: boolean) {
  if (!(await allowed("staff.write"))) return { ok: false as const, message: "You do not have access to this." };
  const session = await actor();
  if (!session) {
    return { ok: false as const, message: "Sign in required." };
  }
  const result = saveStaffMember(await loadStaffDirectory(), draft, id);
  if (!result.ok) {
    return result;
  }
  const requested = draft.accountRole ?? "";
  const accountRole = isEmployeeRole(requested) ? requested : "STAFF";
  const pageAccess = roleHasFullOffice(accountRole) ? [...allPageGrants] : [...new Set(draft.pageAccess ?? [])];
  await upsertStaff({
    ...result.record,
    accountRole,
    pageAccess,
  });
  if (result.record.email) {
    const accessRole = accountRole === "OWNER" ? "OWNER" : accountRole === "SUPER_USER" ? "SUPER_ADMIN" : "MANAGER";
    await db
      .update(appUsers)
      .set({ staffId: result.record.id, accessRole })
      .where(eq(appUsers.username, result.record.email.trim().toLowerCase()));
  }
  revalidatePath("/staff");
  revalidatePath(`/staff/${result.record.id}`);
  if (!inform) {
    return { ok: true as const, record: result.record, message: "Employee saved." };
  }
  if (!result.record.email) {
    return { ok: true as const, record: result.record, message: "Employee saved. Add an email address to inform this person." };
  }
  try {
    const { sendOnboardingEmail } = await import("@/lib/mail/onboarding");
    const mail = await sendOnboardingEmail(result.record.email, result.record.fullName);
    return { ok: true as const, record: result.record, message: mail.sent ? `Employee saved. ${mail.message}` : mail.message };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The mail server refused the message.";
    return { ok: true as const, record: result.record, message: `Employee saved. The onboarding email was not sent. ${detail}` };
  }
}

export async function assignRolesAction(staffId: string, roleIds: string[]) {
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this." };
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
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this." };
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
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this." };
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
