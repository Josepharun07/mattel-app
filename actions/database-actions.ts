"use server";

import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getCurrentSession } from "@/lib/auth/current";
import { describeDatabaseUrl } from "@/lib/persistence/database-target";

export type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  host: string;
  database: string;
  mode: "local" | "hosted" | "missing";
  message: string;
};

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const session = await getCurrentSession();
  if (!session || session.kind !== "staff") {
    return { configured: false, connected: false, host: "", database: "", mode: "missing", message: "Sign in required." };
  }

  const target = describeDatabaseUrl(process.env.DATABASE_URL);
  if (!target.configured) {
    return {
      configured: false,
      connected: false,
      host: "",
      database: "",
      mode: "missing",
      message: target.invalid ? "DATABASE_URL is not a valid URL." : "DATABASE_URL is not set in the server environment.",
    };
  }

  const mode = target.local ? "local" : "hosted";
  try {
    await getDb().execute(sql`select 1`);
    return {
      configured: true,
      connected: true,
      host: target.host,
      database: target.database,
      mode,
      message: "Connected with the credential in DATABASE_URL.",
    };
  } catch {
    return {
      configured: true,
      connected: false,
      host: target.host,
      database: target.database,
      mode,
      message: "The server could not reach this database.",
    };
  }
}
