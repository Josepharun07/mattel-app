import { AccessDenied } from "@/views/auth/access-denied";
import { allowed } from "@/lib/auth/access";
import type { Permission } from "@/lib/auth/rbac";

export async function gate(permission: Permission) {
  if (await allowed(permission)) {
    return null;
  }
  return <AccessDenied />;
}
