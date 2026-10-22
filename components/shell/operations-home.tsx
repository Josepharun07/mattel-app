"use client";

import Link from "next/link";
import { Boxes, FileText, Landmark, RotateCcw, Settings2, Shield, Users, Wallet, Wrench } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/store";

const modules = [
  { title: "Invoice studio", detail: "Write a construction invoice and check it on the A4 sheet.", href: "/invoices/create", icon: FileText },
  { title: "Inventory", detail: "Central rates, stock on hand, and low-stock alerts.", href: "/inventory", icon: Boxes },
  { title: "Rentals", detail: "Who has a tool, and which returns are past the deadline.", href: "/rentals", icon: Wrench },
  { title: "Payroll", detail: "Full day, half day, and overtime for the weekly slip.", href: "/payroll", icon: Wallet },
  { title: "Staff", detail: "People, pay rates, identity, bank, and emergency contacts.", href: "/staff", icon: Users },
  { title: "Roles", detail: "Site roles. Assignment stays with the owner and the super admin.", href: "/admin/roles", icon: Shield },
  { title: "Subcontracts", detail: "A lead, a crew, and advances against the contract.", href: "/subcontracts", icon: Users },
  { title: "Resort rent", detail: "Monthly lease invoices, created only when someone asks.", href: "/resort-rental", icon: Landmark },
  { title: "App settings", detail: "Company profile, bank, units, and each person’s colour.", href: "/settings", icon: Settings2 },
  { title: "Recycle bin", detail: "Restore an archived record. Permanent deletion stays with a super admin.", href: "/settings/recycle-bin", icon: RotateCcw },
];

export function OperationsHome() {
  const workspace = useWorkspace();
  const today = new Date().toISOString().slice(0, 10);
  const lowStock = workspace.inventory.filter(
    (item) => !item.deletedAt && item.currentStock <= item.minSafetyThreshold,
  ).length;
  const overdue = workspace.assignments.filter(
    (item) => !item.actualReturnDate && item.expectedReturnDate < today,
  ).length;
  const contracts = workspace.subcontracts.filter((item) => !item.deletedAt).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Mattel Infrastructures</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Today</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Building Tomorrow&apos;s Foundation. The colour on the stripe is this person&apos;s access colour.
          Documents stay black on white.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Low stock items" value={String(lowStock)} href="/inventory" />
        <Stat label="Overdue tools" value={String(overdue)} href="/rentals" />
        <Stat label="Open subcontracts" value={String(contracts)} href="/subcontracts" />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href + module.title} href={module.href} className="rounded-xl border bg-white p-5 transition-colors hover:border-[var(--app-accent)]">
              <Icon className="size-4 text-[var(--app-accent)]" />
              <h2 className="mt-3 font-medium">{module.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{module.detail}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-white p-4 transition-colors hover:border-[var(--app-accent)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
