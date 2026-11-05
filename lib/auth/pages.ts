export const employeeRoles = [
  { id: "OWNER", label: "Owner" },
  { id: "SUPER_USER", label: "Super user" },
  { id: "MANAGER", label: "Manager or supervisor" },
  { id: "DRIVER", label: "Driver or operator" },
  { id: "STAFF", label: "Staff" },
] as const;

export type EmployeeRole = (typeof employeeRoles)[number]["id"];

export const officePages = [
  { id: "dashboard", label: "Dashboard", group: "Work" },
  { id: "invoices", label: "Invoices", group: "Work" },
  { id: "projects", label: "Projects", group: "Work" },
  { id: "clients", label: "Clients", group: "Work" },
  { id: "inventory", label: "Inventory", group: "Work" },
  { id: "rentals", label: "Rentals", group: "Work" },
  { id: "payroll", label: "Payroll", group: "Work" },
  { id: "subcontracts", label: "Subcontracts", group: "Work" },
  { id: "resort", label: "Resort", group: "Work" },
  { id: "equipment", label: "Equipment", group: "Work" },
  { id: "employees", label: "Employees", group: "People" },
  { id: "approvals", label: "Approvals", group: "Administration" },
  { id: "recycle", label: "Recycle bin", group: "System" },
] as const;

export const settingsPages = [
  { id: "settings.profile", label: "Company profile" },
  { id: "settings.bank", label: "Bank account" },
  { id: "settings.branding", label: "Branding and assets" },
  { id: "settings.units", label: "Measurement units" },
  { id: "settings.defaults", label: "Invoice defaults" },
  { id: "settings.appearance", label: "App settings" },
  { id: "settings.database", label: "Database" },
] as const;

export type PageGrant = (typeof officePages)[number]["id"] | (typeof settingsPages)[number]["id"];

export const allPageGrants: PageGrant[] = [
  ...officePages.map((page) => page.id),
  ...settingsPages.map((page) => page.id),
];

export function isEmployeeRole(value: string): value is EmployeeRole {
  return employeeRoles.some((role) => role.id === value);
}

export function employeeRoleLabel(value: string) {
  return employeeRoles.find((role) => role.id === value)?.label ?? "Staff";
}

export function roleHasFullOffice(value: string) {
  return value === "OWNER" || value === "SUPER_USER";
}

export function pageForPermission(permission: string) {
  if (permission.startsWith("settings.")) return "settings";
  if (permission === "dashboard.view") return "dashboard";
  if (permission.startsWith("invoices.")) return "invoices";
  if (permission.startsWith("projects.")) return "projects";
  if (permission.startsWith("clients.")) return "clients";
  if (permission.startsWith("inventory.")) return "inventory";
  if (permission.startsWith("rentals.")) return "rentals";
  if (permission.startsWith("payroll.")) return "payroll";
  if (permission.startsWith("subcontracts.")) return "subcontracts";
  if (permission.startsWith("resort.")) return "resort";
  if (permission.startsWith("site.")) return "equipment";
  if (permission.startsWith("staff.") || permission === "roles.manage") return "employees";
  if (permission.startsWith("approvals.")) return "approvals";
  if (permission.startsWith("recycle.")) return "recycle";
  return null;
}

export function seesPage(pages: "all" | readonly string[], page: string) {
  if (pages === "all") return true;
  if (page === "settings") return pages.some((item) => item.startsWith("settings."));
  return pages.includes(page);
}
