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
  PanelLeft,
  RotateCcw,
  Settings2,
  Stamp,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/controllers/auth";
import { BrandLogo } from "@/views/brand/logo";
import { ConfirmProvider, useConfirm } from "@/views/shell/confirm";
import { ToastProvider } from "@/views/shell/toast";
import { PortalHome } from "@/views/site/control-desks";
import type { CurrentSession } from "@/lib/auth/current";
import { seesPage } from "@/lib/auth/pages";
import type { RaBill } from "@/lib/site/book";
import { accentById, effectiveAccent } from "@/lib/settings/appearance";
import { noteNavigation, recallScroll, rememberScroll } from "@/lib/navigation/page-memory";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace/store";

const groups: { label: string; links: { href: string; label: string; icon: LucideIcon; page: string }[] }[] = [
  {
    label: "Work",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
      { href: "/invoices/create", label: "Invoices", icon: FileText, page: "invoices" },
      { href: "/projects", label: "Projects", icon: FolderKanban, page: "projects" },
      { href: "/clients", label: "Clients", icon: Contact, page: "clients" },
      { href: "/inventory", label: "Inventory", icon: Boxes, page: "inventory" },
      { href: "/rentals", label: "Rentals", icon: Wrench, page: "rentals" },
      { href: "/payroll", label: "Payroll", icon: Wallet, page: "payroll" },
      { href: "/subcontracts", label: "Subcontracts", icon: Users, page: "subcontracts" },
      { href: "/resort-rental", label: "Resort", icon: Landmark, page: "resort" },
      { href: "/equipment", label: "Equipment", icon: Truck, page: "equipment" },
    ],
  },
  {
    label: "People",
    links: [{ href: "/staff", label: "Employees", icon: HardHat, page: "employees" }],
  },
  {
    label: "Administration",
    links: [{ href: "/approvals", label: "Approvals", icon: Stamp, page: "approvals" }],
  },
  {
    label: "System",
    links: [
      { href: "/settings", label: "Settings", icon: Settings2, page: "settings" },
      { href: "/settings/recycle-bin", label: "Recycle bin", icon: RotateCcw, page: "recycle" },
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

function NavLinks({ collapsed, pathname, accent, session }: { collapsed: boolean; pathname: string; accent: string; session: CurrentSession }) {
  const visible = groups
    .map((group) => {
      const links = group.links.filter((link) => link.page === "settings" || link.page === "self" || seesPage(session.pages, link.page));
      if (group.label === "People" && session.staffId) {
        links.unshift({ href: `/staff/${session.staffId}`, label: "My profile", icon: HardHat, page: "self" });
      }
      return { ...group, links };
    })
    .filter((group) => group.links.length > 0);
  return (
    <>
      {visible.map((group) => (
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

export function AppShell(props: {
  children: ReactNode;
  session: CurrentSession;
  portal: { bills: RaBill[] } | null;
}) {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <OfficeShell {...props} />
      </ToastProvider>
    </ConfirmProvider>
  );
}

function OfficeShell({
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
    noteNavigation(pathname);
    const top = recallScroll(pathname);
    requestAnimationFrame(() => window.scrollTo(0, top));
  }, [pathname]);
  useEffect(() => {
    const save = () => rememberScroll(pathname, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [pathname]);
  useEffect(() => {
    if (session.kind === "staff" && session.role && session.role !== workspace.role) {
      workspace.setRole(session.role);
    }
  }, [session, workspace, workspace.role, workspace.setRole]);
  const confirm = useConfirm();
  async function signOut() {
    const accepted = await confirm({ title: "Sign out?", detail: "This ends the session on this browser." });
    if (!accepted) return;
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
          collapsed ? "w-12" : "w-56",
        )}
      >
        <div className="h-0.5 w-full" style={{ backgroundColor: accent.hex }} />
        <div className={cn("flex items-center px-2", collapsed ? "h-12 justify-center px-1" : "h-16")}>
          <Link href="/" className="flex min-w-0 items-center gap-1.5 px-0.5" title="Mattel Infrastructures">
            <BrandLogo className={cn("shrink-0 object-contain", collapsed ? "h-7 w-7" : "h-11 w-auto")} />
            {collapsed ? null : (
              <span className="flex shrink-0 flex-col justify-center gap-1">
                <span className="text-[18px] font-bold leading-none tracking-tight text-sidebar-foreground">Mattel</span>
                <span className="whitespace-nowrap text-[14px] font-medium leading-none tracking-tight text-muted-foreground">Infrastructures</span>
              </span>
            )}
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
          <NavLinks collapsed={collapsed} pathname={pathname} accent={accent.hex} session={session} />
        </nav>
        <div className={cn("mt-auto flex flex-col gap-1 border-t border-sidebar-border px-2 py-2", collapsed && "items-center px-1")}>
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed ? "size-8" : "w-full justify-start gap-2 px-2",
            )}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <PanelLeft className="size-4 shrink-0" />
            {collapsed ? null : <span className="text-sm">Collapse</span>}
          </button>
          <Link
            href={session.staffId ? `/staff/${session.staffId}` : "/settings"}
            title={session.name}
            aria-label={session.name}
            className={cn(
              "inline-flex h-8 items-center rounded-md hover:bg-sidebar-accent",
              collapsed ? "size-8 justify-center" : "w-full justify-start gap-2 px-1",
            )}
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {(session.name.trim()[0] ?? "M").toUpperCase()}
            </span>
            {collapsed ? null : <span className="min-w-0 truncate text-sm">{session.name}</span>}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
