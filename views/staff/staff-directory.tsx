"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { PageFrame } from "@/views/shell/page-frame";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/views/ui/card";
import { employeeRoleLabel } from "@/lib/auth/pages";
import type { StaffDirectory, StaffRecord } from "@/lib/staff/directory";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function StaffDirectoryGrid({ directory, canAdd }: { directory: StaffDirectory; canAdd: boolean }) {
  const people = directory.staff.filter((person) => !person.deletedAt);

  return (
    <PageFrame
      eyebrow="People"
      title="Employees"
      description={`${people.length} ${people.length === 1 ? "employee" : "employees"} on file.`}
      width="wide"
      action={
        canAdd ? (
          <Button asChild>
            <Link href="/staff/new">Add new</Link>
          </Button>
        ) : null
      }
    >
      {people.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">No employees yet. Add the first person.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <StaffCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function StaffCard({ person }: { person: StaffRecord }) {
  const phone = person.phones[0]?.number;
  return (
    <Link href={`/staff/${person.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full gap-3 transition-colors hover:bg-accent/40">
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{initials(person.fullName)}</span>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{person.fullName}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">{employeeRoleLabel(person.accountRole ?? "STAFF")}</p>
          </div>
          <Badge tone={person.active === false ? "neutral" : "success"} className="ml-auto">{person.active === false ? "Inactive" : "Active"}</Badge>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          {person.email ? <p className="flex items-center gap-2"><Mail className="size-3.5" />{person.email}</p> : null}
          {phone ? <p className="flex items-center gap-2"><Phone className="size-3.5" />{phone}</p> : null}
          {person.joiningDate ? <p>Joined {person.joiningDate}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
