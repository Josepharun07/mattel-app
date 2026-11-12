import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessRoles, staff } from "@/db/schema";
import { builtInAccessRoles } from "@/lib/auth/access-roles";

export type AccessRoleRow = {
  id: string;
  name: string;
  slug: string;
  pages: string[];
  builtIn: boolean;
  employeeCount: number;
};

function sortRoles<T extends { slug: string; name: string }>(roles: T[]) {
  const order = builtInAccessRoles.map((role) => role.slug);
  return [...roles].sort((left, right) => {
    const leftIndex = order.indexOf(left.slug);
    const rightIndex = order.indexOf(right.slug);
    if (leftIndex === -1 && rightIndex === -1) return left.name.localeCompare(right.name);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

export async function listAccessRoles(): Promise<AccessRoleRow[]> {
  const [roles, counts] = await Promise.all([
    db.select().from(accessRoles).where(isNull(accessRoles.deletedAt)),
    db
      .select({ id: staff.accessRoleId, total: sql<number>`count(*)::int` })
      .from(staff)
      .where(isNull(staff.deletedAt))
      .groupBy(staff.accessRoleId),
  ]);
  const employees = new Map(counts.map((row) => [row.id, Number(row.total)]));
  return sortRoles(roles).map((role) => ({
    id: role.id,
    name: role.name,
    slug: role.slug,
    pages: role.pages ?? [],
    builtIn: role.builtIn,
    employeeCount: employees.get(role.id) ?? 0,
  }));
}

export async function findAccessRole(id: string) {
  const [role] = await db.select().from(accessRoles).where(and(eq(accessRoles.id, id), isNull(accessRoles.deletedAt))).limit(1);
  if (!role) return null;
  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(staff)
    .where(and(eq(staff.accessRoleId, id), isNull(staff.deletedAt)));
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    pages: role.pages ?? [],
    builtIn: role.builtIn,
    employeeCount: Number(count?.total ?? 0),
  };
}
