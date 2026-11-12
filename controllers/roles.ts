"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessRoles, staff } from "@/db/schema";
import { allowed } from "@/lib/auth/access";
import { cleanRolePages } from "@/lib/auth/access-roles";
import { findAccessRole, listAccessRoles } from "@/models/access-roles";

function slugFor(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "role";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function getRoles() {
  if (!(await allowed("roles.manage"))) return [];
  return listAccessRoles();
}

export async function getRole(id: string) {
  if (!(await allowed("roles.manage"))) return null;
  return findAccessRole(id);
}

export async function createAccessRole(name: string) {
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this." };
  const label = name.trim();
  if (!label) return { ok: false as const, message: "Enter a role name." };
  const [clash] = await db
    .select({ id: accessRoles.id })
    .from(accessRoles)
    .where(and(isNull(accessRoles.deletedAt), sql`lower(${accessRoles.name}) = ${label.toLowerCase()}`))
    .limit(1);
  if (clash) return { ok: false as const, message: "That role already exists." };
  const [created] = await db
    .insert(accessRoles)
    .values({ name: label, slug: slugFor(label), pages: ["dashboard"], builtIn: false })
    .returning({ id: accessRoles.id });
  revalidatePath("/roles");
  return { ok: true as const, id: created.id, message: "Role created." };
}

export async function saveAccessRole(id: string, name: string, pages: string[]) {
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this.", name: "", pages: [] as string[] };
  const label = name.trim();
  if (!label) return { ok: false as const, message: "Enter a role name.", name: "", pages: [] as string[] };
  const role = await findAccessRole(id);
  if (!role) return { ok: false as const, message: "That role was not found.", name: "", pages: [] as string[] };
  const [clash] = await db
    .select({ id: accessRoles.id })
    .from(accessRoles)
    .where(and(isNull(accessRoles.deletedAt), sql`lower(${accessRoles.name}) = ${label.toLowerCase()}`))
    .limit(1);
  if (clash && clash.id !== id) return { ok: false as const, message: "That role already exists.", name: role.name, pages: role.pages };
  const next = cleanRolePages(pages, role.slug);
  await db.transaction(async (tx) => {
    await tx.update(accessRoles).set({ name: label, pages: next }).where(eq(accessRoles.id, id));
    await tx.update(staff).set({ role: label, pageAccess: next }).where(eq(staff.accessRoleId, id));
  });
  revalidatePath("/roles");
  revalidatePath(`/roles/${id}`);
  revalidatePath("/staff");
  return { ok: true as const, message: "Role saved.", name: label, pages: next };
}

export async function deleteAccessRole(id: string) {
  if (!(await allowed("roles.manage"))) return { ok: false as const, message: "You do not have access to this." };
  const role = await findAccessRole(id);
  if (!role) return { ok: false as const, message: "That role was not found." };
  if (role.builtIn) return { ok: false as const, message: "Built-in roles stay on the list." };
  if (role.employeeCount > 0) return { ok: false as const, message: "Move the employees on this role to another role first." };
  await db.delete(accessRoles).where(eq(accessRoles.id, id));
  revalidatePath("/roles");
  return { ok: true as const, message: "Role removed." };
}
