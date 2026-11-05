import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  width?: keyof typeof widths;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto flex w-full min-w-0 max-w-full flex-col gap-6 px-4 py-6 sm:px-6", widths[width])}>
      <header className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
