export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  try {
    const { getDb } = await import("@/db");
    const { ensureSuperAdmin } = await import("@/lib/auth/ensure-admin");
    await ensureSuperAdmin(getDb());
  } catch (error) {
    console.error("Super admin account was not synced from the environment.", error);
  }
}
