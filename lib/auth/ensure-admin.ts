import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { hashPassword } from "./passwords";

export function adminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set.");
  }
  return { username, password };
}

export async function ensureSuperAdmin(database: PostgresJsDatabase<typeof schema>) {
  const { username, password } = adminCredentials();
  const passwordHash = hashPassword(password);
  const [existing] = await database
    .select({ id: schema.appUsers.id })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.accessRole, "SUPER_ADMIN"))
    .limit(1);
  if (existing) {
    await database
      .update(schema.appUsers)
      .set({ username, passwordHash, displayName: "Super admin", kind: "staff", accessRole: "SUPER_ADMIN" })
      .where(eq(schema.appUsers.id, existing.id));
    return;
  }
  await database.insert(schema.appUsers).values({
    username,
    passwordHash,
    kind: "staff",
    displayName: "Super admin",
    accessRole: "SUPER_ADMIN",
  });
}
