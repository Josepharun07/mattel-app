"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Overview" },
  { href: "/invoices/create", label: "Invoices" },
  { href: "/resort-rental", label: "Resort" },
  { href: "/inventory", label: "Inventory" },
  { href: "/projects/project-abc-site/ledger", label: "Ledger" },
  { href: "/rentals", label: "Rentals" },
  { href: "/payroll", label: "Payroll" },
  { href: "/subcontracts", label: "Subcontracts" },
  { href: "/settings", label: "Settings" },
  { href: "/settings/recycle-bin", label: "Recycle Bin" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 px-4 text-white sm:px-6" style={{ backgroundColor: "var(--app-accent)" }}>
      <Link href="/" className="shrink-0 text-sm font-semibold tracking-wide">
        Mattel Infrastructures
      </Link>
      <nav className="flex items-center gap-1 overflow-x-auto text-xs sm:text-sm">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href === "/inventory" && pathname.startsWith("/inventory")) ||
            (link.href === "/payroll" && pathname.startsWith("/payroll")) ||
            (link.href.startsWith("/projects") && pathname.startsWith("/projects")) ||
            (link.href === "/rentals" && pathname.startsWith("/rentals")) ||
            (link.href === "/subcontracts" && pathname.startsWith("/subcontracts")) ||
            (link.href === "/resort-rental" && pathname.startsWith("/resort-rental"));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-white/80 hover:bg-white/10 hover:text-white",
                active && "bg-white/10 text-white",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
