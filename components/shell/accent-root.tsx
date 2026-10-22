"use client";

import type { CSSProperties, ReactNode } from "react";
import { accentById, effectiveAccent } from "@/lib/settings/appearance";
import { useWorkspace } from "@/lib/workspace/store";

export function AccentRoot({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const current = workspace.users.find((person) => person.id === workspace.currentUserId) ?? workspace.users[0];
  const hex = accentById(effectiveAccent(current, workspace.roleColors)).hex;

  return (
    <div className="flex min-h-full flex-1 flex-col" style={{ "--app-accent": hex } as CSSProperties}>
      {children}
    </div>
  );
}
