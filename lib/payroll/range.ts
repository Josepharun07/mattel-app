import { differenceInDays, eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

export function formatDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function currentWeek(today = new Date()) {
  return {
    start: formatDay(startOfWeek(today, { weekStartsOn: 1 })),
    end: formatDay(endOfWeek(today, { weekStartsOn: 1 })),
  };
}

export function listDates(start: string, end: string): string[] {
  const from = parseISO(start);
  const to = parseISO(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return [];
  }
  if (differenceInDays(to, from) > 31) {
    return [];
  }
  return eachDayOfInterval({ start: from, end: to }).map((date) => formatDay(date));
}

export function formatRangeLabel(start: string, end: string): string {
  return `${format(parseISO(start), "d MMM yyyy")} – ${format(parseISO(end), "d MMM yyyy")}`;
}

export function defaultCheckoutEnd(start: string, end: string, today = new Date()): string {
  const key = formatDay(today);
  if (key < start || key > end) {
    return end;
  }
  return key;
}
