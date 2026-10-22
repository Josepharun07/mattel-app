import type { AccessRole } from "@/lib/settings/appearance";

export type AuthSession =
  | { kind: "staff"; username: string; name: string; role: AccessRole; userId: string }
  | { kind: "vendor"; username: string; name: string }
  | { kind: "client"; username: string; name: string };

type Account = AuthSession & { password: string };

const accounts: Account[] = [
  { kind: "staff", username: "operator", password: "operator", name: "Site operator", role: "OPERATOR", userId: "user-operator" },
  { kind: "staff", username: "manager", password: "manager", name: "Site manager", role: "MANAGER", userId: "user-manager" },
  { kind: "staff", username: "owner", password: "owner", name: "Owner", role: "OWNER", userId: "user-owner" },
  { kind: "staff", username: "admin", password: "admin", name: "Super admin", role: "SUPER_ADMIN", userId: "user-super" },
  { kind: "vendor", username: "vendor", password: "vendor", name: "ABC Supplies" },
  { kind: "client", username: "client", password: "client", name: "ABC Constructions" },
];

export const localAccountHints = accounts.map((account) => ({
  username: account.username,
  password: account.password,
  name: account.name,
}));

export function signInLocal(username: string, password: string) {
  const account = accounts.find((item) => item.username === username.trim().toLowerCase() && item.password === password);
  if (!account) {
    return { ok: false as const, message: "Those details do not match a local account." };
  }
  const { password: _password, ...session } = account;
  return { ok: true as const, session };
}
