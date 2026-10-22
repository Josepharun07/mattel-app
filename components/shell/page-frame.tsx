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
    <div className={cn("mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8", widths[width])}>
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
