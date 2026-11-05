import type { CurrentSession } from "@/lib/auth/current";
import { pageForPermission, seesPage } from "@/lib/auth/pages";
import type { AccessRole } from "@/lib/settings/appearance";

export const permissions = [
  "dashboard.view",
  "clients.read",
  "clients.write",
  "projects.read",
  "projects.write",
  "inventory.read",
  "inventory.write",
  "rentals.read",
  "rentals.write",
  "site.read",
  "site.write",
  "settings.read",
  "staff.read",
  "invoices.read",
  "invoices.write",
  "payroll.read",
  "payroll.write",
  "subcontracts.read",
  "subcontracts.write",
  "resort.read",
  "resort.write",
  "staff.write",
  "roles.manage",
  "approvals.review",
  "settings.write",
  "recycle.read",
  "recycle.restore",
  "recycle.purge",
] as const;

export type Permission = (typeof permissions)[number];

const office: AccessRole[] = ["OWNER", "SUPER_ADMIN"];

const grants: Record<Permission, AccessRole[]> = {
  "dashboard.view": office,
  "clients.read": office,
  "clients.write": office,
  "projects.read": office,
  "projects.write": office,
  "inventory.read": office,
  "inventory.write": office,
  "rentals.read": office,
  "rentals.write": office,
  "site.read": office,
  "site.write": office,
  "settings.read": office,
  "staff.read": office,
  "invoices.read": office,
  "invoices.write": office,
  "payroll.read": office,
  "payroll.write": office,
  "subcontracts.read": office,
  "subcontracts.write": office,
  "resort.read": office,
  "resort.write": office,
  "staff.write": office,
  "roles.manage": office,
  "approvals.review": office,
  "settings.write": office,
  "recycle.read": office,
  "recycle.restore": office,
  "recycle.purge": office,
};

export function isOfficeRole(role: AccessRole) {
  return office.includes(role);
}

const routePermissions: { prefix: string; permission: Permission }[] = [
  { prefix: "/settings/recycle-bin", permission: "recycle.read" },
  { prefix: "/admin/roles", permission: "roles.manage" },
  { prefix: "/approvals", permission: "approvals.review" },
  { prefix: "/settings", permission: "settings.read" },
  { prefix: "/staff", permission: "staff.read" },
  { prefix: "/payroll", permission: "payroll.read" },
  { prefix: "/subcontracts", permission: "subcontracts.read" },
  { prefix: "/resort-rental", permission: "resort.read" },
  { prefix: "/resort", permission: "resort.read" },
  { prefix: "/invoices", permission: "invoices.read" },
  { prefix: "/inventory", permission: "inventory.read" },
  { prefix: "/rentals", permission: "rentals.read" },
  { prefix: "/projects", permission: "projects.read" },
  { prefix: "/clients", permission: "clients.read" },
  { prefix: "/equipment", permission: "site.read" },
  { prefix: "/", permission: "dashboard.view" },
];

export function roleAllows(role: AccessRole, permission: Permission) {
  return grants[permission].includes(role);
}

export function allows(session: Pick<CurrentSession, "kind" | "role" | "pages">, permission: Permission) {
  if (session.kind !== "staff" || !session.role) {
    return false;
  }
  if (!session.pages) {
    return roleAllows(session.role, permission);
  }
  if (permission === "settings.read" && session.kind === "staff") {
    return true;
  }
  const page = pageForPermission(permission);
  if (!page) return false;
  return seesPage(session.pages, page);
}

export function permissionForPath(pathname: string): Permission {
  const path = pathname.split("?")[0] || "/";
  const match = routePermissions.find((route) =>
    route.prefix === "/" ? path === "/" : path === route.prefix || path.startsWith(`${route.prefix}/`),
  );
  return match?.permission ?? "dashboard.view";
}
