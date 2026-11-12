import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects, staff } from "@/db/schema";

const tables = { client: clients, project: projects, employee: staff } as const;

export function codeStem(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters + "XXX").slice(0, 3);
}

export function nextPublicCode(existing: string[], name: string) {
  const stem = codeStem(name);
  const used = existing
    .filter((code) => code.startsWith(stem))
    .map((code) => Number(code.slice(stem.length)))
    .filter((value) => Number.isInteger(value) && value > 0);
  const next = (used.length > 0 ? Math.max(...used) : 0) + 1;
  return `${stem}${next}`;
}

export function cleanPublicCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function allocatePublicCode(kind: keyof typeof tables, name: string) {
  const table = tables[kind];
  const rows = await db.select({ code: table.publicCode }).from(table);
  return nextPublicCode(rows.map((row) => row.code).filter((code): code is string => Boolean(code)), name);
}

export async function savePublicCode(kind: keyof typeof tables, id: string, requested: string) {
  const code = cleanPublicCode(requested);
  if (!/^[A-Z]{3}[0-9]+$/.test(code)) {
    return { ok: false as const, message: "Use three letters and a number, such as TES1." };
  }
  const table = tables[kind];
  const clash = await db.select({ id: table.id }).from(table).where(and(eq(table.publicCode, code), ne(table.id, id))).limit(1);
  if (clash.length > 0) {
    return { ok: false as const, message: "That id is already used." };
  }
  await db.update(table).set({ publicCode: code }).where(eq(table.id, id));
  return { ok: true as const, code };
}
