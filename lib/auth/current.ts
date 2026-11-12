import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { accessRoles, appSessions, appUsers, staff } from "@/db/schema";
import { attachStaffProfile } from "@/lib/auth/ensure-admin";
import type { AccessRole } from "@/lib/settings/appearance";

export type CurrentSession = {
  userId: string;
  username: string;
  name: string;
  kind: "staff" | "vendor" | "client";
  role: AccessRole | null;
  staffId: string | null;
  pages: "all" | string[];
};

const cookieName = "mattel_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isKind(value: string): value is CurrentSession["kind"] {
  return value === "staff" || value === "vendor" || value === "client";
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) {
    return null;
  }
  const [row] = await db
    .select({
      userId: appUsers.id,
      username: appUsers.username,
      name: appUsers.displayName,
      kind: appUsers.kind,
      role: appUsers.accessRole,
      staffId: appUsers.staffId,
    })
    .from(appSessions)
    .innerJoin(appUsers, eq(appUsers.id, appSessions.userId))
    .where(and(eq(appSessions.tokenHash, hashToken(token)), gt(appSessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !isKind(row.kind)) {
    return null;
  }
  const role = row.role === "OPERATOR" || row.role === "MANAGER" || row.role === "OWNER" || row.role === "SUPER_ADMIN" ? row.role : null;
  const staffId = await attachStaffProfile(db, { id: row.userId, username: row.username, name: row.name, role, staffId: row.staffId });
  let pages: string[] = [];
  if (staffId) {
    const [person] = await db
      .select({ pages: accessRoles.pages })
      .from(staff)
      .leftJoin(accessRoles, eq(accessRoles.id, staff.accessRoleId))
      .where(eq(staff.id, staffId))
      .limit(1);
    pages = person?.pages ?? [];
  }
  if (role === "SUPER_ADMIN" && !pages.includes("roles")) pages = [...pages, "roles"];
  return { userId: row.userId, username: row.username, name: row.name, kind: row.kind, role, staffId, pages };
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(appSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  const store = await cookies();
  store.set(cookieName, token, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) {
    await db.delete(appSessions).where(eq(appSessions.tokenHash, hashToken(token)));
  }
  store.delete(cookieName);
}
