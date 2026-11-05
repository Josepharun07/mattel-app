import { describe, expect, it } from "vitest";
import { permissionForPath, roleAllows } from "@/lib/auth/rbac";

describe("role access", () => {
  it("keeps the current office for the owner and the super admin", () => {
    expect(roleAllows("OPERATOR", "clients.write")).toBe(false);
    expect(roleAllows("OPERATOR", "settings.read")).toBe(false);
    expect(roleAllows("MANAGER", "invoices.write")).toBe(false);
    expect(roleAllows("MANAGER", "payroll.write")).toBe(false);
    expect(roleAllows("OWNER", "clients.write")).toBe(true);
    expect(roleAllows("OWNER", "payroll.write")).toBe(true);
    expect(roleAllows("OWNER", "recycle.purge")).toBe(true);
    expect(roleAllows("SUPER_ADMIN", "recycle.purge")).toBe(true);
    expect(roleAllows("SUPER_ADMIN", "roles.manage")).toBe(true);
  });

  it("matches a path to the screen permission", () => {
    expect(permissionForPath("/settings/recycle-bin")).toBe("recycle.read");
    expect(permissionForPath("/settings")).toBe("settings.read");
    expect(permissionForPath("/payroll/settlements")).toBe("payroll.read");
    expect(permissionForPath("/")).toBe("dashboard.view");
  });
});
