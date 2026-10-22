"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  Boxes,
  FileText,
  HardHat,
  LayoutDashboard,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings2,
  Shield,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { accentById, effectiveAccent } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace/store";

const groups: { label: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Work",
    links: [
      { href: "/", label: "Today", icon: LayoutDashboard },
      { href: "/invoices/create", label: "Invoices", icon: FileText },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/rentals", label: "Rentals", icon: Wrench },
      { href: "/payroll", label: "Payroll", icon: Wallet },
      { href: "/subcontracts", label: "Subcontracts", icon: Users },
      { href: "/resort-rental", label: "Resort", icon: Landmark },
    ],
  },
  {
    label: "People",
    links: [{ href: "/staff", label: "Staff", icon: HardHat }],
  },
  {
    label: "Administration",
    links: [{ href: "/admin/roles", label: "Roles", icon: Shield }],
  },
  {
    label: "System",
    links: [
      { href: "/settings", label: "Settings", icon: Settings2 },
      { href: "/settings/recycle-bin", label: "Recycle bin", icon: RotateCcw },
    ],
  },
];

const navKey = "mattel.nav.collapsed";
const navEvent = "mattel-nav-collapsed";
let collapsedSnapshot = false;
let navHydrated = false;

function readCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }
  if (!navHydrated) {
    navHydrated = true;
    collapsedSnapshot = window.localStorage.getItem(navKey) === "1";
  }
  return collapsedSnapshot;
}

function subscribeCollapsed(onStoreChange: () => void) {
  const notify = () => onStoreChange();
  window.addEventListener(navEvent, notify);
  return () => window.removeEventListener(navEvent, notify);
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/settings") {
    return pathname === "/settings";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ collapsed, pathname, accent }: { collapsed: boolean; pathname: string; accent: string }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {collapsed ? null : (
            <p className="px-2 pb-1 text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase">{group.label}</p>
          )}
          {group.links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-600 hover:bg-slate-100",
                  collapsed && "justify-center px-0",
                  active && "text-white hover:bg-transparent",
                )}
                style={active ? { backgroundColor: accent } : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const workspace = useWorkspace();
  const current = workspace.users.find((person) => person.id === workspace.currentUserId) ?? workspace.users[0];
  const accent = accentById(effectiveAccent(current, workspace.roleColors));

  function toggle() {
    collapsedSnapshot = !readCollapsed();
    window.localStorage.setItem(navKey, collapsedSnapshot ? "1" : "0");
    window.dispatchEvent(new Event(navEvent));
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-white transition-[width] md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="h-1 w-full" style={{ backgroundColor: accent.hex }} />
        <div className={cn("flex h-14 items-center gap-2 px-3", collapsed && "justify-center px-2")}>
          <Link href="/" className="truncate text-sm font-semibold" title="Mattel Infrastructures">
            {collapsed ? "MI" : "Mattel Infrastructures"}
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
          <NavLinks collapsed={collapsed} pathname={pathname} accent={accent.hex} />
        </nav>
        <div className="border-t px-2 py-3">
          {collapsed ? null : (
            <div className="px-2 pb-2 text-xs">
              <p className="truncate font-medium">{current.name}</p>
              <p className="mt-1 truncate" style={{ color: accent.hex }}>
                {accent.name}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-slate-600 hover:bg-slate-100",
              collapsed && "justify-center px-0",
            )}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b bg-white md:hidden">
          <div className="h-1 w-full" style={{ backgroundColor: accent.hex }} />
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="text-sm font-semibold">
              Mattel Infrastructures
            </Link>
            <span className="text-xs" style={{ color: accent.hex }}>
              {current.name}
            </span>
          </div>
          <nav className="flex flex-col gap-3 px-3 pb-3">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase">{group.label}</p>
                <div className="flex gap-1 overflow-x-auto">
                  {group.links.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100",
                          active && "text-white hover:bg-transparent",
                        )}
                        style={active ? { backgroundColor: accent.hex } : undefined}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </header>
        <div className="no-print hidden h-1 w-full md:block" style={{ backgroundColor: accent.hex }} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
