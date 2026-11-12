"use client";

import { format, getDay, parseISO } from "date-fns";
import { Lock } from "lucide-react";
import { Badge } from "@/views/ui/badge";
import { Input } from "@/views/ui/input";
import type { AttendanceCell, StaffMember } from "@/lib/payroll/types";

const marks = [
  { value: "0", label: "Absent" },
  { value: "0.5", label: "Half day" },
  { value: "1", label: "Full day" },
] as const;

export function AttendanceGrid({
  staff,
  dates,
  attendance,
  onChange,
}: {
  staff: StaffMember[];
  dates: string[];
  attendance: AttendanceCell[];
  onChange: (cell: AttendanceCell) => void;
}) {
  if (dates.length === 0) {
    return <p className="text-sm text-muted-foreground">Choose a range of 31 days or fewer.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Worker</th>
            {dates.map((date) => (
              <th key={date} className={getDay(parseISO(date)) === 0 ? "bg-slate-50 px-3 py-2 font-medium" : "px-3 py-2 font-medium"}>
                {format(parseISO(date), "EEE d")}
                {getDay(parseISO(date)) === 0 ? <span className="mt-0.5 block text-[10px] font-normal">Off unless worked</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id} className="border-b last:border-b-0">
              <td className="px-3 py-3 align-top">
                <p className="font-medium">{person.fullName}</p>
                <p className="text-xs text-muted-foreground">{person.role}</p>
              </td>
              {dates.map((date) => {
                const cell = attendance.find((row) => row.staffId === person.id && row.workDate === date) ?? {
                  id: `draft-${person.id}-${date}`,
                  staffId: person.id,
                  workDate: date,
                  isPresent: false,
                  dayFraction: 0,
                  overtimeHours: 0,
                  settlementId: null,
                };
                const fraction = cell.dayFraction ?? (cell.isPresent ? 1 : 0);
                const locked = Boolean(cell.settlementId);
                return (
                  <td key={date} className={locked || getDay(parseISO(date)) === 0 ? "bg-slate-50 px-3 py-3 align-top" : "px-3 py-3 align-top"}>
                    {locked ? (
                      <Badge tone="success">
                        <Lock className="mr-1 size-3" />
                        Settled
                      </Badge>
                    ) : (
                      <div className="space-y-2">
                        <select
                          aria-label={`Day mark for ${person.fullName} on ${date}`}
                          className="h-8 w-full rounded-md border bg-white px-2 text-xs"
                          value={fraction >= 1 ? "1" : fraction > 0 ? "0.5" : "0"}
                          onChange={(event) => {
                            const dayFraction = Number(event.target.value);
                            onChange({
                              ...cell,
                              dayFraction,
                              isPresent: dayFraction > 0,
                              overtimeHours: dayFraction > 0 ? cell.overtimeHours : 0,
                            });
                          }}
                        >
                          {marks.map((mark) => (
                            <option key={mark.value} value={mark.value}>{mark.label}</option>
                          ))}
                        </select>
                        <Input
                          aria-label={`Overtime hours for ${person.fullName} on ${date}`}
                          className="h-8 w-20 font-mono"
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          disabled={fraction <= 0}
                          value={cell.overtimeHours}
                          onChange={(event) =>
                            onChange({
                              ...cell,
                              overtimeHours: Math.min(24, Math.max(0, Number(event.target.value) || 0)),
                            })
                          }
                        />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
