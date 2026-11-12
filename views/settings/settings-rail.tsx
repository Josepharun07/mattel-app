"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePageState } from "@/lib/navigation/page-memory";
import { Building2, CreditCard, Database, FileSignature, Palette, Settings, Sliders, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const settingsSections: { id: SettingsSectionId; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Company Profile", icon: Building2 },
  { id: "bank", label: "Bank Account Details", icon: CreditCard },
  { id: "branding", label: "Branding & Assets", icon: FileSignature },
  { id: "units", label: "Measurement Units", icon: Sliders },
  { id: "defaults", label: "Invoice Defaults", icon: Settings },
  { id: "appearance", label: "App Settings", icon: Palette },
  { id: "database", label: "Database", icon: Database },
];

export type SettingsSectionId = "profile" | "bank" | "branding" | "units" | "defaults" | "appearance" | "database";

const SettingsSectionContext = createContext<{
  section: SettingsSectionId;
  setSection: (id: SettingsSectionId) => void;
} | null>(null);

export function SettingsSectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = usePageState<SettingsSectionId>("tab", "profile");
  return <SettingsSectionContext.Provider value={{ section, setSection }}>{children}</SettingsSectionContext.Provider>;
}

export function useSettingsSection() {
  const value = useContext(SettingsSectionContext);
  if (!value) {
    throw new Error("Settings sections must render inside SettingsSectionProvider.");
  }
  return value;
}

export function SettingsRail({ pages, accent }: { pages: "all" | string[]; accent: string }) {
  const { section, setSection } = useSettingsSection();
  const visible = settingsSections.filter((item) => pages === "all" || pages.includes(`settings.${item.id}`));
  const current = visible.some((item) => item.id === section) ? section : visible[0]?.id;

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2 py-3 text-sidebar-foreground">
      <p className="px-2.5 pb-2 text-xs font-medium text-muted-foreground">Settings</p>
      <nav className="flex flex-col gap-1">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-sidebar-accent",
                active && "bg-card text-foreground",
              )}
              style={
                active
                  ? { boxShadow: `inset 3px 0 0 ${accent}, 0 1px 1px rgb(0 0 0 / 0.04), 0 6px 12px -10px rgb(0 0 0 / 0.16)` }
                  : undefined
              }
              aria-current={active ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
