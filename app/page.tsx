import Link from "next/link";
import { Boxes, FileText, Landmark, RotateCcw, Settings2, Users, Wallet, Wrench } from "lucide-react";

const modules = [
  {
    title: "Project ledger & invoicing",
    detail: "Unbilled material rows compile into an A4 invoice with MI/CON numbering.",
    href: "/invoices/create",
    icon: FileText,
  },
  {
    title: "Central inventory",
    detail: "Warehouse rates, stock thresholds, and low-stock alerts.",
    href: "/inventory",
    icon: Boxes,
  },
  {
    title: "Tool & asset rentals",
    detail: "Internal employees and external renters, with overdue return warnings.",
    href: "/assets",
    icon: Wrench,
  },
  {
    title: "Resort rental income",
    detail: "Manual monthly lease invoices numbered MI/RES/YYYY/XXXX.",
    href: "/resort-rental",
    icon: Landmark,
  },
  {
    title: "Labour payroll",
    detail: "Full day, half day, and overtime hours times the hourly rate.",
    href: "/payroll",
    icon: Wallet,
  },
  {
    title: "Subcontracts",
    detail: "Team leads, worker groups, and advance draws against the contract balance.",
    href: "/subcontracts",
    icon: Users,
  },
  {
    title: "Company settings",
    detail: "Profile, operating account, logo, signature, and measurement units.",
    href: "/settings",
    icon: Settings2,
  },
  {
    title: "Recycle bin",
    detail: "Operators restore archived items. Super Admin can permanently purge them.",
    href: "/settings/recycle-bin",
    icon: RotateCcw,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <section className="rounded-2xl bg-steel px-6 py-8 text-white">
        <p className="text-xs tracking-[0.18em] text-white/60 uppercase">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold">Mattel Infrastructures</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Building Tomorrow&apos;s Foundation. Ledgers, inventory, asset rentals, weekly wages,
          subcontracts, and resort billing share one PostgreSQL record.
        </p>
        <Link
          href="/invoices/create"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-action px-4 text-sm font-medium text-white"
        >
          Open invoice studio
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          const body = (
            <>
              <Icon className="size-4 text-action" />
              <h2 className="mt-3 font-medium">{module.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{module.detail}</p>
            </>
          );

          return (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-xl border bg-white p-5 transition-colors hover:border-action/40"
            >
              {body}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
