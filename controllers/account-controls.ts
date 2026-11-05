"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, clients, passwordResets, profileChangeRequests, projects, staff } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/current";
import { hashPassword } from "@/lib/auth/passwords";
import { newResetToken, sendPasswordResetEmail } from "@/lib/mail/reset";
import { loadStaffDirectory, upsertStaff } from "@/lib/persistence/staff-db";
import { saveStaffMember, type StaffDraft } from "@/lib/staff/directory";

function isAdmin(role: string | null) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

async function adminSession() {
  const session = await getCurrentSession();
  if (!session || session.kind !== "staff" || !isAdmin(session.role)) {
    return null;
  }
  return session;
}

export async function setClientActive(id: string, active: boolean) {
  const session = await adminSession();
  if (!session) return { success: false as const, message: "An admin has to do this." };
  await db.update(clients).set({ active }).where(eq(clients.id, id));
  const [client] = await db.select({ email: clients.email }).from(clients).where(eq(clients.id, id)).limit(1);
  if (client?.email) {
    await db.update(appUsers).set({ active }).where(eq(appUsers.username, client.email.trim().toLowerCase()));
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true as const, message: active ? "Client is active." : "Client is inactive." };
}

export async function setProjectActive(id: string, active: boolean) {
  const session = await adminSession();
  if (!session) return { success: false as const, message: "An admin has to do this." };
  await db.update(projects).set({ active }).where(eq(projects.id, id));
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { success: true as const, message: active ? "Project is active." : "Project is inactive." };
}

export async function setEmployeeActive(id: string, active: boolean) {
  const session = await adminSession();
  if (!session) return { success: false as const, message: "An admin has to do this." };
  await db.update(staff).set({ active }).where(eq(staff.id, id));
  await db.update(appUsers).set({ active }).where(eq(appUsers.staffId, id));
  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
  return { success: true as const, message: active ? "Employee is active." : "Employee is inactive." };
}

async function ensureLogin(staffId: string) {
  const [person] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!person) return { ok: false as const, message: "Employee was not found." };
  const email = person.email.trim().toLowerCase();
  if (!email) return { ok: false as const, message: "Add an email address before resetting the password." };
  const [existing] = await db.select().from(appUsers).where(eq(appUsers.username, email)).limit(1);
  if (existing) {
    await db.update(appUsers).set({ staffId, displayName: person.fullName, kind: "staff" }).where(eq(appUsers.id, existing.id));
    return { ok: true as const, userId: existing.id, email, name: person.fullName };
  }
  const [created] = await db
    .insert(appUsers)
    .values({
      username: email,
      passwordHash: hashPassword(randomBytes(18).toString("hex")),
      kind: "staff",
      displayName: person.fullName,
      accessRole: "MANAGER",
      staffId,
      active: person.active,
    })
    .returning({ id: appUsers.id });
  return { ok: true as const, userId: created.id, email, name: person.fullName };
}

export async function setEmployeePassword(staffId: string, password: string) {
  const session = await adminSession();
  if (!session) return { success: false as const, message: "An admin has to do this." };
  if (password.trim().length < 8) return { success: false as const, message: "Use at least 8 characters." };
  const login = await ensureLogin(staffId);
  if (!login.ok) return { success: false as const, message: login.message };
  await db.update(appUsers).set({ passwordHash: hashPassword(password.trim()) }).where(eq(appUsers.id, login.userId));
  await db.delete(passwordResets).where(eq(passwordResets.userId, login.userId));
  return { success: true as const, message: "Password updated." };
}

export async function sendEmployeeResetLink(staffId: string, origin: string) {
  const session = await adminSession();
  if (!session) return { success: false as const, message: "An admin has to do this." };
  const login = await ensureLogin(staffId);
  if (!login.ok) return { success: false as const, message: login.message };
  const { token, tokenHash } = newResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.delete(passwordResets).where(eq(passwordResets.userId, login.userId));
  await db.insert(passwordResets).values({ userId: login.userId, tokenHash, expiresAt });
  const link = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
  const mail = await sendPasswordResetEmail(login.email, login.name, link);
  return { success: true as const, message: mail.message };
}

export async function completePasswordReset(token: string, password: string) {
  if (password.trim().length < 8) return { success: false as const, message: "Use at least 8 characters." };
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, tokenHash)).limit(1);
  if (!row || row.expiresAt < new Date()) {
    return { success: false as const, message: "This reset link has expired. Ask an admin for a new one." };
  }
  await db.update(appUsers).set({ passwordHash: hashPassword(password.trim()) }).where(eq(appUsers.id, row.userId));
  await db.delete(passwordResets).where(eq(passwordResets.userId, row.userId));
  return { success: true as const, message: "Password updated. You can sign in." };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestProfileUpdate(staffId: string, draft: StaffDraft) {
  const session = await getCurrentSession();
  if (!session || session.kind !== "staff" || session.staffId !== staffId) {
    return { ok: false as const, message: "You can request a change only for your own profile." };
  }
  const directory = await loadStaffDirectory();
  const checked = saveStaffMember(directory, draft, staffId);
  if (!checked.ok) return checked;
  const payload = { ...checked.record, accountRole: draft.accountRole, pageAccess: draft.pageAccess ?? [] };
  const [existing] = await db
    .select({ id: profileChangeRequests.id })
    .from(profileChangeRequests)
    .where(and(eq(profileChangeRequests.staffId, staffId), eq(profileChangeRequests.status, "PENDING")))
    .limit(1);
  if (existing) {
    await db.update(profileChangeRequests).set({ payload, submittedBy: session.userId }).where(eq(profileChangeRequests.id, existing.id));
  } else {
    await db.insert(profileChangeRequests).values({ staffId, payload, submittedBy: session.userId, status: "PENDING" });
  }
  revalidatePath(`/staff/${staffId}`);
  return { ok: true as const, pending: true as const, message: "Sent to an admin. The record changes after an admin approves it." };
}

export async function reviewProfileUpdate(requestId: string, decision: "APPROVED" | "REJECTED") {
  const session = await adminSession();
  if (!session) return { ok: false as const, message: "An admin has to do this." };
  const [request] = await db.select().from(profileChangeRequests).where(eq(profileChangeRequests.id, requestId)).limit(1);
  if (!request || request.status !== "PENDING") return { ok: false as const, message: "That request is no longer waiting." };
  if (decision === "APPROVED") {
    const directory = await loadStaffDirectory();
    const current = directory.staff.find((person) => person.id === request.staffId);
    if (!current) return { ok: false as const, message: "Employee was not found." };
    const payload = request.payload as StaffDraft & { id?: string };
    const saved = saveStaffMember(directory, payload, request.staffId);
    if (!saved.ok) return saved;
    await upsertStaff({ ...saved.record, accountRole: current.accountRole, pageAccess: current.pageAccess });
  }
  await db
    .update(profileChangeRequests)
    .set({ status: decision, reviewedBy: session.userId, reviewedAt: new Date() })
    .where(eq(profileChangeRequests.id, requestId));
  revalidatePath("/staff");
  revalidatePath(`/staff/${request.staffId}`);
  return { ok: true as const, message: decision === "APPROVED" ? "Profile updated." : "Request declined." };
}

export async function pendingProfileRequest(staffId: string) {
  const [row] = await db
    .select({ id: profileChangeRequests.id, payload: profileChangeRequests.payload })
    .from(profileChangeRequests)
    .where(and(eq(profileChangeRequests.staffId, staffId), eq(profileChangeRequests.status, "PENDING")))
    .limit(1);
  if (!row) return null;
  const payload = row.payload as { fullName?: string; email?: string; address?: string };
  return { id: row.id, fullName: payload.fullName ?? "", email: payload.email ?? "", address: payload.address ?? "" };
}
