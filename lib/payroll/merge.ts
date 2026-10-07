import type { AttendanceCell } from "@/lib/payroll/types";

export function mergeCells(base: AttendanceCell[], patches: AttendanceCell[]): AttendanceCell[] {
  const map = new Map(base.map((cell) => [`${cell.staffId}:${cell.workDate}`, cell]));
  for (const cell of patches) {
    map.set(`${cell.staffId}:${cell.workDate}`, cell);
  }
  return [...map.values()];
}

export function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const map = new Map(base.map((row) => [row.id, row]));
  for (const row of extra) {
    map.set(row.id, row);
  }
  return [...map.values()];
}
