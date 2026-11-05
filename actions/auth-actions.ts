"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { clearSession, startSession, type CurrentSession } from "@/lib/auth/current";
import { verifyPassword } from "@/lib/auth/passwords";

export type { CurrentSession };

export async function signInAction(username: string, password: string) {
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.username, username.trim().toLowerCase()))
    .limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, message: "Those details do not match an account." };
  }
  await startSession(user.id);
  const session: CurrentSession = {
    userId: user.id,
    username: user.username,
    name: user.displayName,
    kind: user.kind === "vendor" || user.kind === "client" ? user.kind : "staff",
    role: user.accessRole === "OPERATOR" || user.accessRole === "MANAGER" || user.accessRole === "OWNER" || user.accessRole === "SUPER_ADMIN" ? user.accessRole : null,
  };
  return { ok: true as const, session };
}

export async function signOutAction() {
  await clearSession();
  return { ok: true as const };
}
