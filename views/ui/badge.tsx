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
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "warning" && "bg-[#f6e7c8] text-[#6d4a12]",
        tone === "success" && "bg-[#dcecde] text-[#1f6b45]",
        tone === "neutral" && "bg-secondary text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
