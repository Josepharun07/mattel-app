"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  Boxes,
  FileText,
  HardHat,
  LayoutDashboard,
  Landmark,
  FolderKanban,
  Contact,
  ListTree,
  PanelLeft,
  PieChart,
  RotateCcw,
  Settings2,
  Shield,
  Stamp,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/actions/auth-actions";
import { BrandLogo } from "@/components/brand/logo";
import { PortalHome } from "@/components/site/control-desks";
import type { CurrentSession } from "@/lib/auth/current";
import type { RaBill } from "@/lib/site/book";
import { accentById, effectiveAccent } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace/store";

const groups: { label: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Work",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/invoices/create", label: "Invoices", icon: FileText },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/clients", label: "Clients", icon: Contact },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/rentals", label: "Rentals", icon: Wrench },
      { href: "/payroll", label: "Payroll", icon: Wallet },
      { href: "/subcontracts", label: "Subcontracts", icon: Users },
      { href: "/resort-rental", label: "Resort", icon: Landmark },
      { href: "/boq", label: "BOQ", icon: ListTree },
      { href: "/equipment", label: "Equipment", icon: Truck },
      { href: "/budget", label: "Budget", icon: PieChart },
    ],
  },
  {
    label: "People",
    links: [{ href: "/staff", label: "Staff", icon: HardHat }],
  },
  {
    label: "Administration",
    links: [
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/approvals", label: "Approvals", icon: Stamp },
    ],
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
let preferStored = false;

function readCollapsed() {
  if (preferStored && typeof window !== "undefined") {
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
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
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
                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                  active && "text-white hover:text-white",
                )}
                style={active ? { backgroundColor: accent } : undefined}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function AppShell({
  children,
  session,
  portal,
}: {
  children: ReactNode;
  session: CurrentSession;
  portal: { bills: RaBill[] } | null;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const workspace = useWorkspace();
  useEffect(() => {
    preferStored = true;
    window.dispatchEvent(new Event(navEvent));
  }, []);
  useEffect(() => {
    if (session.kind === "staff" && session.role && session.role !== workspace.role) {
      workspace.setRole(session.role);
    }
  }, [session, workspace, workspace.role, workspace.setRole]);
  async function signOut() {
    await signOutAction();
    window.location.assign("/");
  }
  if (session.kind !== "staff") {
    return (
      <div className="min-h-svh bg-[#F4F7FB]">
        <header className="no-print flex h-14 items-center justify-between border-b bg-white px-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BrandLogo className="h-8 w-auto" />
            {session.name}
          </p>
          <button type="button" className="text-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </header>
        <PortalHome kind={session.kind} name={session.name} bills={portal?.bills ?? []} />
      </div>
    );
  }
  const current = workspace.users.find((person) => person.id === workspace.currentUserId) ?? workspace.users[0];
  const accent = accentById(effectiveAccent(current, workspace.roleColors));

  function toggle() {
    preferStored = true;
    collapsedSnapshot = !readCollapsed();
    window.localStorage.setItem(navKey, collapsedSnapshot ? "1" : "0");
    window.dispatchEvent(new Event(navEvent));
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside
        className={cn(
          "no-print sticky top-0 flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          collapsed ? "w-12" : "w-44",
        )}
      >
        <div className="h-0.5 w-full" style={{ backgroundColor: accent.hex }} />
        <div className={cn("flex h-12 items-center gap-1 px-2", collapsed && "justify-center px-1")}>
          <Link href="/" className={cn("flex min-w-0 items-center gap-2 px-1", !collapsed && "flex-1")} title="Mattel Infrastructures">
            <BrandLogo className={cn("shrink-0 object-contain", collapsed ? "h-7 w-7" : "h-10 w-auto")} />
            {collapsed ? null : <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">Mattel</span>}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <PanelLeft className="size-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
          <NavLinks collapsed={collapsed} pathname={pathname} accent={accent.hex} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
