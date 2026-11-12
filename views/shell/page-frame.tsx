import type { ReactNode } from "react";
import { BackButton } from "@/views/shell/back-button";
import { cn } from "@/lib/utils";

const sectionLabels = new Set([
  "Work",
  "People",
  "System",
  "Resort",
  "Yard",
  "Contracts",
  "Workforce",
  "Warehouse",
  "Site",
  "Administration",
  "Settings",
  "Invoices",
  "Access",
  "Vendor",
  "Client",
]);

const widths = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
} as const;

export function PageFrame({
  eyebrow,
  title,
  description,
  width = "default",
  action,
  leading,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  width?: keyof typeof widths;
  action?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
}) {
  const caption = sectionLabels.has(eyebrow) ? null : eyebrow;
  return (
    <div className={cn("mx-auto flex w-full min-w-0 max-w-full flex-col gap-5 px-4 py-5 sm:px-6", widths[width])}>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton />
          <div className="min-w-0 space-y-1.5">
            {leading}
            <h1 className="font-serif text-2xl font-medium text-balance text-foreground">{title}</h1>
            {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
            {description ? <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
