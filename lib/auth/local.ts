import type { AccessRole } from "@/lib/settings/appearance";

export type AuthSession =
  | { kind: "staff"; username: string; name: string; role: AccessRole; userId: string }
  | { kind: "vendor"; username: string; name: string }
  | { kind: "client"; username: string; name: string };

export function signInLocal(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedUser || !expectedPassword || username.trim().toLowerCase() !== expectedUser || password !== expectedPassword) {
    return { ok: false as const, message: "Those details do not match a local account." };
  }
  return {
    ok: true as const,
    session: {
      kind: "staff" as const,
      username: expectedUser,
      name: "Super admin",
      role: "SUPER_ADMIN" as const,
      userId: "env-admin",
    },
  };
}
