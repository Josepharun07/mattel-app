"use client";

import { format, parseISO } from "date-fns";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AttendanceCell, StaffMember } from "@/lib/payroll/types";

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
              <th key={date} className="px-3 py-2 font-medium">
                {format(parseISO(date), "EEE d")}
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
                  overtimeHours: 0,
                  settlementId: null,
                };
                const locked = Boolean(cell.settlementId);
                return (
                  <td key={date} className={locked ? "bg-slate-50 px-3 py-3 align-top" : "px-3 py-3 align-top"}>
                    {locked ? (
                      <Badge tone="success">
                        <Lock className="mr-1 size-3" />
                        Settled
                      </Badge>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={cell.isPresent}
                            aria-label={`Present for ${person.fullName} on ${date}`}
                            onCheckedChange={(checked) =>
                              onChange({
                                ...cell,
                                isPresent: checked,
                                overtimeHours: checked ? cell.overtimeHours : 0,
                              })
                            }
                          />
                          {cell.isPresent ? "Present" : "Absent"}
                        </label>
                        <Input
                          aria-label={`Overtime hours for ${person.fullName} on ${date}`}
                          className="h-8 w-20 font-mono"
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          disabled={!cell.isPresent}
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
