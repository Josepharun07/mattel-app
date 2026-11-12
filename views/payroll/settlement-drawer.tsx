import type { ReactNode } from "react";
import { Button } from "@/views/ui/button";

export function SettlementDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close settlement" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Settlement</p>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
