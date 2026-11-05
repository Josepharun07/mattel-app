import { getCurrentSession } from "@/lib/auth/current";
import { allows, type Permission } from "@/lib/auth/rbac";

const message = "You do not have access to this.";

export async function allowed(permission: Permission) {
  const session = await getCurrentSession();
  return Boolean(session && allows(session, permission));
}

export function deniedAction() {
  return { success: false as const, message };
}

export function deniedOk() {
  return { ok: false as const, message };
}
