"use client";

import { type ReactNode } from "react";
import { BackButton } from "@/components/shell/back-button";
import { Button } from "@/components/ui/button";
import { usePageState } from "@/lib/navigation/page-memory";

export function InvoiceStudioFrame({
  notice,
  form,
  preview,
}: {
  notice?: ReactNode;
  form: ReactNode;
  preview: ReactNode;
}) {
  const [open, setOpen] = usePageState("invoice-preview-open", true);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-4 px-4 py-5 lg:px-6">
      {notice}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <BackButton />
          <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Invoices</p>
          <h1 className="text-xl font-semibold tracking-tight">New invoice</h1>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide preview" : "Show preview"}
        </Button>
      </div>
      <div className={open ? "grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]" : ""}>
        <div className="min-w-0">{form}</div>
        {open ? (
          <section className="min-w-0 overflow-x-auto rounded-2xl bg-[#EEF2F6] p-3 xl:sticky xl:top-4">
            <p className="no-print mb-3 text-xs tracking-wide text-muted-foreground">Preview</p>
            {preview}
          </section>
        ) : null}
      </div>
    </div>
  );
}
