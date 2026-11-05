"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageFrame } from "@/views/shell/page-frame";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/views/ui/card";

export type ClientRow = {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  active: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientsDesk({ clients }: { clients: ClientRow[] }) {
  return (
    <PageFrame
      eyebrow="Work"
      title="Clients"
      description={`${clients.length} ${clients.length === 1 ? "client" : "clients"} on file.`}
      width="wide"
      action={
        <Button asChild>
          <Link href="/clients/new">Add new</Link>
        </Button>
      }
    >
      {clients.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">No clients yet. Add the first one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full gap-3 transition-colors hover:bg-accent/40">
              <CardHeader className="flex-row items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{initials(client.name)}</span>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{client.name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{client.companyName || "Client"}</p>
                </div>
                <Badge tone={client.active === false ? "warning" : "success"} className="ml-auto">{client.active === false ? "Inactive" : "Active"}</Badge>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {client.phone ? <p className="flex items-center gap-2"><Phone className="size-3.5" />{client.phone}</p> : null}
                {client.email ? <p className="flex items-center gap-2"><Mail className="size-3.5" />{client.email}</p> : null}
                {client.address ? <p className="flex items-center gap-2"><MapPin className="size-3.5" />{client.address}</p> : null}
                {client.gstin ? <p>GSTIN {client.gstin}</p> : null}
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
