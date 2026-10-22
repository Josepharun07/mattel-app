"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function InvoiceStudioFrame({
  notice,
  form,
  preview,
}: {
  notice?: ReactNode;
  form: ReactNode;
  preview: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 lg:px-6">
      {notice}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Invoices</p>
          <h1 className="text-2xl font-semibold">New invoice</h1>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide preview" : "Show preview"}
        </Button>
      </div>
      <div className={open ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_620px]" : ""}>
        <div className="min-w-0">{form}</div>
        {open ? (
          <section className="overflow-auto rounded-2xl bg-[#EEF2F6] p-4 lg:sticky lg:top-4">
            <p className="no-print mb-3 text-xs tracking-wide text-muted-foreground">Preview</p>
            {preview}
          </section>
        ) : null}
      </div>
    </div>
  );
}
