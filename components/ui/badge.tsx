import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "warning" | "success";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
