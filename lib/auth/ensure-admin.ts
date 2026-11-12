import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { builtInAccessRoles } from "@/lib/auth/access-roles";
import { nextPublicCode } from "@/lib/records/public-code";
import { hashPassword } from "./passwords";

export async function ensureAccessRoles(database: PostgresJsDatabase<typeof schema>) {
  for (const role of builtInAccessRoles) {
    const [existing] = await database.select({ id: schema.accessRoles.id }).from(schema.accessRoles).where(eq(schema.accessRoles.slug, role.slug)).limit(1);
    if (!existing) {
      await database.insert(schema.accessRoles).values({ name: role.name, slug: role.slug, pages: [...role.pages], builtIn: true });
    }
  }
}

async function roleIdFor(database: PostgresJsDatabase<typeof schema>, slug: string) {
  const [role] = await database.select({ id: schema.accessRoles.id }).from(schema.accessRoles).where(eq(schema.accessRoles.slug, slug)).limit(1);
  return role?.id ?? null;
}

export function adminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set.");
  }
  return { username, password };
}

export async function attachStaffProfile(
  database: PostgresJsDatabase<typeof schema>,
  user: { id: string; username: string; name: string; role: string | null; staffId: string | null },
) {
  const slug = user.role === "OWNER" ? "owner" : "super-admin";
  const accessRoleId = user.role === "SUPER_ADMIN" || user.role === "OWNER" ? await roleIdFor(database, slug) : null;
  if (user.staffId) {
    const [linked] = await database.select({ id: schema.staff.id }).from(schema.staff).where(eq(schema.staff.id, user.staffId)).limit(1);
    if (linked) {
      if (accessRoleId) {
        await database.update(schema.staff).set({ accessRoleId }).where(and(eq(schema.staff.id, linked.id), isNull(schema.staff.accessRoleId)));
      }
      return user.staffId;
    }
  }
  const [byEmail] = await database
    .select({ id: schema.staff.id })
    .from(schema.staff)
    .where(eq(schema.staff.email, user.username))
    .limit(1);
  if (byEmail) {
    await database.update(schema.appUsers).set({ staffId: byEmail.id }).where(eq(schema.appUsers.id, user.id));
    return byEmail.id;
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "OWNER") return user.staffId;
  const codes = await database.select({ code: schema.staff.publicCode }).from(schema.staff);
  const [created] = await database
    .insert(schema.staff)
    .values({
      fullName: user.name || "Super admin",
      publicCode: nextPublicCode(codes.map((row) => row.code).filter((code): code is string => Boolean(code)), user.name || "Super admin"),
      role: user.role === "OWNER" ? "Owner" : "Super admin",
      accountRole: user.role === "OWNER" ? "OWNER" : "SUPER_USER",
      accessRoleId,
      hourlyRate: "0.00",
      dailyBaseRate: "0.00",
      email: user.username.includes("@") ? user.username : "",
    })
    .returning({ id: schema.staff.id });
  await database.update(schema.appUsers).set({ staffId: created.id }).where(eq(schema.appUsers.id, user.id));
  return created.id;
}

export async function ensureSuperAdmin(database: PostgresJsDatabase<typeof schema>) {
  await ensureAccessRoles(database);
  const { username, password } = adminCredentials();
  const passwordHash = hashPassword(password);
  const [existing] = await database
    .select({ id: schema.appUsers.id, staffId: schema.appUsers.staffId })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.accessRole, "SUPER_ADMIN"))
    .limit(1);
  if (existing) {
    await database
      .update(schema.appUsers)
      .set({ username, passwordHash, displayName: "Super admin", kind: "staff", accessRole: "SUPER_ADMIN" })
      .where(eq(schema.appUsers.id, existing.id));
    await attachStaffProfile(database, { id: existing.id, username, name: "Super admin", role: "SUPER_ADMIN", staffId: existing.staffId });
    return;
  }
  const [created] = await database
    .insert(schema.appUsers)
    .values({
      username,
      passwordHash,
      kind: "staff",
      displayName: "Super admin",
      accessRole: "SUPER_ADMIN",
    })
    .returning({ id: schema.appUsers.id });
  await attachStaffProfile(database, { id: created.id, username, name: "Super admin", role: "SUPER_ADMIN", staffId: null });
}
