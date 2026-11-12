import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { accessRoles, appSessions, appUsers, staff } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { attachStaffProfile, ensureAccessRoles } from "@/lib/auth/ensure-admin";
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
  try {
    const { data } = await auth.getSession();
    const email = data?.user?.email?.trim().toLowerCase();
    if (!email) return null;
    await ensureAccessRoles(db);
    const [row] = await db
      .select({
        userId: appUsers.id,
        username: appUsers.username,
        name: appUsers.displayName,
        kind: appUsers.kind,
        role: appUsers.accessRole,
        staffId: appUsers.staffId,
        active: appUsers.active,
      })
      .from(appUsers)
      .where(eq(appUsers.username, email))
      .limit(1);
    if (!row || !row.active || !isKind(row.kind)) {
      return null;
    }
    const role = row.role === "OPERATOR" || row.role === "MANAGER" || row.role === "OWNER" || row.role === "SUPER_ADMIN" ? row.role : null;
    let staffId = row.staffId;
    try {
      staffId = await attachStaffProfile(db, { id: row.userId, username: row.username, name: row.name, role, staffId: row.staffId });
    } catch (error) {
      console.error("Staff profile was not attached.", error);
    }
    let pages: CurrentSession["pages"] = [];
    if (staffId) {
      try {
        const [person] = await db
          .select({ pages: accessRoles.pages })
          .from(staff)
          .leftJoin(accessRoles, eq(accessRoles.id, staff.accessRoleId))
          .where(eq(staff.id, staffId))
          .limit(1);
        pages = person?.pages ?? [];
      } catch (error) {
        console.error("Role pages were not loaded.", error);
        if (role === "OWNER" || role === "SUPER_ADMIN") pages = "all";
      }
    }
    if (role === "SUPER_ADMIN" && pages !== "all" && !pages.includes("roles")) pages = [...pages, "roles"];
    return { userId: row.userId, username: row.username, name: row.name, kind: row.kind, role, staffId, pages };
  } catch (error) {
    console.error("Session lookup failed.", error);
    return null;
  }
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(appSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) {
    await db.delete(appSessions).where(eq(appSessions.tokenHash, hashToken(token)));
  }
  store.delete(cookieName);
}
