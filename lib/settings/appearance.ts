export const accessRoles = ["OPERATOR", "MANAGER", "SUPER_ADMIN"] as const;

export type AccessRole = (typeof accessRoles)[number];

export const accentPalette = [
  { id: "steel", name: "Steel blue", hex: "#1D4ED8" },
  { id: "signal", name: "Signal blue", hex: "#2563EB" },
  { id: "sky", name: "Sky", hex: "#0284C7" },
  { id: "indigo", name: "Indigo", hex: "#4F46E5" },
  { id: "teal", name: "Teal", hex: "#0F766E" },
  { id: "slate", name: "Slate", hex: "#334155" },
] as const;

export type AccentId = (typeof accentPalette)[number]["id"];

export type AppearanceUser = {
  id: string;
  name: string;
  role: AccessRole;
  colorId: AccentId;
  canEditColor: boolean;
};

export type RoleColors = { OPERATOR: AccentId };

export function isAccentId(value: string): value is AccentId {
  return accentPalette.some((color) => color.id === value);
}

export function accentById(id: AccentId) {
  return accentPalette.find((color) => color.id === id) ?? accentPalette[1];
}

export function isLowLevelRole(role: AccessRole) {
  return role === "OPERATOR";
}

export function reservedAccentIds(roleColors: RoleColors): AccentId[] {
  return [roleColors.OPERATOR];
}

export function canChooseAccent(user: AppearanceUser) {
  return !isLowLevelRole(user.role) && user.canEditColor;
}

export function openAccentIds(roleColors: RoleColors): AccentId[] {
  const reserved = new Set(reservedAccentIds(roleColors));
  return accentPalette.map((color) => color.id).filter((id) => !reserved.has(id));
}

export function choicesFor(user: AppearanceUser, roleColors: RoleColors): AccentId[] {
  if (!canChooseAccent(user)) {
    return [];
  }
  return openAccentIds(roleColors);
}

export function effectiveAccent(user: AppearanceUser, roleColors: RoleColors): AccentId {
  if (isLowLevelRole(user.role)) {
    return roleColors.OPERATOR;
  }
  return user.colorId;
}

function firstOpen(roleColors: RoleColors, avoid?: AccentId): AccentId {
  return openAccentIds(roleColors).find((id) => id !== avoid) ?? "signal";
}

export function chooseOwnAccent(user: AppearanceUser, roleColors: RoleColors, colorId: AccentId) {
  if (!canChooseAccent(user)) {
    return { ok: false as const, message: "A super admin controls this colour." };
  }
  if (reservedAccentIds(roleColors).includes(colorId)) {
    return { ok: false as const, message: "That colour is reserved for a low-level role." };
  }
  return { ok: true as const, user: { ...user, colorId } };
}

export function assignRoleAccent(users: AppearanceUser[], roleColors: RoleColors, colorId: AccentId) {
  const nextColors: RoleColors = { OPERATOR: colorId };
  const fallback = firstOpen(nextColors);
  const nextUsers = users.map((user) => {
    if (isLowLevelRole(user.role)) {
      return { ...user, colorId, canEditColor: false };
    }
    if (user.colorId === colorId) {
      return { ...user, colorId: fallback };
    }
    return user;
  });
  return { roleColors: nextColors, users: nextUsers };
}

export function assignMemberAccent(
  user: AppearanceUser,
  roleColors: RoleColors,
  colorId: AccentId,
) {
  if (isLowLevelRole(user.role)) {
    return { ...user, colorId: roleColors.OPERATOR, canEditColor: false };
  }
  if (reservedAccentIds(roleColors).includes(colorId)) {
    return user;
  }
  return { ...user, colorId };
}

export function setColorEditing(user: AppearanceUser, canEditColor: boolean) {
  if (isLowLevelRole(user.role)) {
    return { ...user, canEditColor: false };
  }
  return { ...user, canEditColor };
}
