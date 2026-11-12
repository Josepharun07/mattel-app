"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { ensureSuperAdmin } from "@/lib/auth/ensure-admin";
import { clearSession, type CurrentSession } from "@/lib/auth/current";
import { auth } from "@/lib/auth/server";

function signInFailure(error: unknown) {
  const raw = error instanceof Error ? error.message : "Sign in failed.";
  const message = raw.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…");
  console.error("Sign in failed.", error);
  if (/DATABASE_URL is not set/i.test(message)) {
    return "The server has no DATABASE_URL. Add the hosted database URL in Vercel, then redeploy.";
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|getaddrinfo|timeout/i.test(message)) {
    return "The server could not reach the database. DATABASE_URL on Vercel has to be the hosted database, not localhost.";
  }
  if (/ssl|certificate|self signed/i.test(message)) {
    return "The database rejected the secure connection. Use the host's SSL connection string.";
  }
  if (/password authentication failed|28P01/i.test(message)) {
    return "The database rejected the username or password in DATABASE_URL.";
  }
  if (/does not exist/i.test(message)) {
    return "The database is missing a table. Apply the migrations, then sign in again.";
  }
  return "Sign in could not be completed.";
}

export type { CurrentSession };

export async function signInAction(username: string, password: string) {
  const email = username.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false as const, message: "Sign in with the account email." };
  }
  try {
    const { error } = await auth.signIn.email({ email, password });
    if (error) {
      const text = `${error.message ?? ""}`;
      if (/invalid|password|credential|not found/i.test(text)) {
        return { ok: false as const, message: "Those details do not match an account." };
      }
      return { ok: false as const, message: "Sign in could not be completed." };
    }
  } catch (error) {
    return { ok: false as const, message: signInFailure(error) };
  }
  let user: typeof appUsers.$inferSelect | undefined;
  try {
    if (email === process.env.ADMIN_USERNAME?.trim().toLowerCase()) {
      await ensureSuperAdmin(db);
    }
    const [row] = await db.select().from(appUsers).where(eq(appUsers.username, email)).limit(1);
    user = row;
  } catch (error) {
    await auth.signOut().catch(() => undefined);
    return { ok: false as const, message: signInFailure(error) };
  }
  if (!user) {
    await auth.signOut().catch(() => undefined);
    return { ok: false as const, message: "Those details do not match an account." };
  }
  if (!user.active) {
    await auth.signOut().catch(() => undefined);
    return { ok: false as const, message: "This account is inactive. Ask an admin to turn it back on." };
  }
  const session: CurrentSession = {
    userId: user.id,
    username: user.username,
    name: user.displayName,
    kind: user.kind === "vendor" || user.kind === "client" ? user.kind : "staff",
    role: user.accessRole === "OPERATOR" || user.accessRole === "MANAGER" || user.accessRole === "OWNER" || user.accessRole === "SUPER_ADMIN" ? user.accessRole : null,
    pages: user.accessRole === "OWNER" || user.accessRole === "SUPER_ADMIN" ? "all" : [],
    staffId: user.staffId,
  };
  return { ok: true as const, session };
}

export async function signOutAction() {
  await auth.signOut().catch(() => undefined);
  await clearSession().catch(() => undefined);
  return { ok: true as const };
}
