import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "warn" && "bg-warning/10 text-warning",
        tone === "ok" && "bg-success/10 text-success",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
