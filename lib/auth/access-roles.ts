import { allPageGrants, officePages, settingsPages, type PageGrant } from "@/lib/auth/pages";
import type { AccessRole } from "@/lib/settings/appearance";

const work = officePages.filter((page) => page.group === "Work").map((page) => page.id);
const people = ["employees"] as const satisfies readonly PageGrant[];

export const builtInAccessRoles: { slug: string; name: string; pages: PageGrant[] }[] = [
  { slug: "super-admin", name: "Super admin", pages: [...allPageGrants] },
  {
    slug: "admin",
    name: "Admin",
    pages: [...work, ...people, "roles", "approvals", "settings.profile", "settings.bank", "settings.branding", "settings.units", "settings.defaults", "settings.appearance"],
  },
  { slug: "owner", name: "Owner", pages: [...allPageGrants] },
  { slug: "driver", name: "Driver", pages: ["dashboard", "attendance", "equipment"] },
  { slug: "construction", name: "Construction employee", pages: ["dashboard", "attendance", "projects", "equipment"] },
  { slug: "agriculture", name: "Agriculture employee", pages: ["dashboard", "attendance"] },
];

export const payrollExemptSlugs = new Set(["super-admin", "owner"]);

export function knownPage(value: string): value is PageGrant {
  return allPageGrants.includes(value as PageGrant);
}

export function cleanRolePages(pages: readonly string[], slug?: string) {
  const next = [...new Set(pages.filter(knownPage))];
  if (slug === "super-admin" && !next.includes("roles")) next.push("roles");
  return next;
}

export function legacyAccountRole(slug: string) {
  if (slug === "owner") return "OWNER";
  if (slug === "super-admin") return "SUPER_USER";
  if (slug === "admin") return "MANAGER";
  if (slug === "driver") return "DRIVER";
  return "STAFF";
}

export function loginAccessRole(slug: string): AccessRole {
  if (slug === "owner") return "OWNER";
  if (slug === "super-admin") return "SUPER_ADMIN";
  return "MANAGER";
}

export const rolePageGroups = [
  ...["Work", "People", "Administration", "System"].map((group) => ({
    label: group,
    pages: officePages.filter((page) => page.group === group).map((page) => ({ id: page.id, label: page.label })),
  })),
  { label: "Settings", pages: settingsPages.map((page) => ({ id: page.id, label: page.label })) },
];
