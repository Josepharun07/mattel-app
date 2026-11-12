import { sql } from "drizzle-orm";
import { db } from "@/db";

const origin = "http://localhost:3000";

function authBase() {
  const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEON_AUTH_BASE_URL is not set.");
  }
  return base;
}

async function authPost(path: string, body: unknown, cookie?: string) {
  return fetch(`${authBase()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function errorCode(response: Response) {
  try {
    const body = (await response.json()) as { code?: string };
    return body.code ?? "";
  } catch {
    return "";
  }
}

function cookieHeader(response: Response) {
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return cookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
}

function firstId(result: unknown) {
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: Array<{ id?: unknown }> }).rows ?? []);
  const id = rows[0]?.id;
  return typeof id === "string" ? id : "";
}

async function adminCookie() {
  const email = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) return "";
  const response = await authPost("/sign-in/email", { email, password });
  if (!response.ok) return "";
  return cookieHeader(response);
}

export async function ensureNeonSuperuser(email: string, password: string) {
  if (!process.env.NEON_AUTH_BASE_URL) return;
  const created = await authPost("/sign-up/email", { email, password, name: "Super admin" });
  if (!created.ok) {
    const code = await errorCode(created);
    if (code === "PASSWORD_TOO_SHORT") {
      console.error("ADMIN_PASSWORD must be at least 8 characters before the superuser can sign in.");
    } else if (code && code !== "USER_ALREADY_EXISTS" && code !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      console.error("Superuser login was not created.", created.status, code);
    }
  }
  await db.execute(sql`
    update neon_auth."user"
    set role = 'admin', "emailVerified" = true
    where lower(email) = ${email}
  `);
}

export async function syncLoginPassword(email: string, password: string, name: string) {
  const normalized = email.trim().toLowerCase();
  if (!process.env.NEON_AUTH_BASE_URL) {
    return { ok: false as const, message: "Sign-in is not configured." };
  }
  const existingId = firstId(
    await db.execute(sql`select id from neon_auth."user" where lower(email) = ${normalized} limit 1`),
  );
  if (!existingId) {
    const created = await authPost("/sign-up/email", { email: normalized, password, name });
    if (created.ok) return { ok: true as const };
    const cookie = await adminCookie();
    if (!cookie) return { ok: false as const, message: "The login could not be created." };
    const again = await authPost("/admin/create-user", { email: normalized, password, name, role: "user" }, cookie);
    if (!again.ok) return { ok: false as const, message: "The login could not be created." };
    return { ok: true as const };
  }
  const cookie = await adminCookie();
  if (!cookie) return { ok: false as const, message: "The password could not be saved." };
  const updated = await authPost("/admin/set-user-password", { userId: existingId, newPassword: password }, cookie);
  if (!updated.ok) return { ok: false as const, message: "The password could not be saved." };
  return { ok: true as const };
}
