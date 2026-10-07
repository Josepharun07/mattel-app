import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;
let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!database) {
    client = postgres(url, { max: 1, prepare: false });
    database = drizzle(client, { schema });
  }

  return database;
}

export async function closeDb() {
  await client?.end({ timeout: 5 });
  client = undefined;
  database = undefined;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const real = getDb();
    const value = Reflect.get(real, property, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
