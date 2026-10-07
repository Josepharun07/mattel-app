"use client";

import { ArrowRight, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/money";

export function CompileInvoiceBar({
  count,
  total,
  busy,
  onCompile,
}: {
  count: number;
  total: number;
  busy?: boolean;
  onCompile: () => void;
}) {
  if (count < 1) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="size-4 text-blue-600" />
          {count} Items Selected | Total Selected Unbilled Value: {formatInr(total)}
        </p>
        <Button type="button" disabled={busy} onClick={onCompile}>
          Compile into Invoice
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
