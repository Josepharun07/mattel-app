import { describe, expect, it } from "vitest";
import {
  assignRoleAccent,
  choicesFor,
  chooseOwnAccent,
  effectiveAccent,
  setColorEditing,
  type AppearanceUser,
  type RoleColors,
} from "@/lib/settings/appearance";

const roleColors: RoleColors = { OPERATOR: "slate" };

const operator: AppearanceUser = {
  id: "user-operator",
  name: "Site operator",
  role: "OPERATOR",
  colorId: "slate",
  canEditColor: false,
};

const manager: AppearanceUser = {
  id: "user-manager",
  name: "Site manager",
  role: "MANAGER",
  colorId: "signal",
  canEditColor: true,
};

describe("app appearance colours", () => {
  it("gives a low-level worker the role colour", () => {
    expect(effectiveAccent(operator, roleColors)).toBe("slate");
    expect(choicesFor(operator, roleColors)).toEqual([]);
    expect(chooseOwnAccent(operator, roleColors, "sky").ok).toBe(false);
  });

  it("lets a manager choose any colour that is not reserved", () => {
    expect(choicesFor(manager, roleColors)).toEqual(["steel", "signal", "sky", "indigo", "teal"]);
    const chosen = chooseOwnAccent(manager, roleColors, "sky");
    expect(chosen.ok).toBe(true);
    if (chosen.ok) {
      expect(chosen.user.colorId).toBe("sky");
    }
    expect(chooseOwnAccent(manager, roleColors, "slate").ok).toBe(false);
  });

  it("keeps a manager's colour when editing is turned off", () => {
    const locked = setColorEditing(manager, false);
    expect(locked.canEditColor).toBe(false);
    expect(locked.colorId).toBe("signal");
    expect(choicesFor(locked, roleColors)).toEqual([]);
    expect(setColorEditing(operator, true).canEditColor).toBe(false);
  });

  it("moves higher roles off a colour when it is reserved", () => {
    const settled = assignRoleAccent([operator, { ...manager, colorId: "teal" }], roleColors, "teal");
    expect(settled.roleColors.OPERATOR).toBe("teal");
    expect(settled.users.find((user) => user.role === "OPERATOR")?.colorId).toBe("teal");
    expect(settled.users.find((user) => user.role === "MANAGER")?.colorId).not.toBe("teal");
  });
});
