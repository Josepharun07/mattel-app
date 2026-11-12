"use client";

import { useEffect, useState } from "react";
import { renameInvoice } from "@/controllers/invoices";

const draft = { id: "", name: "", saved: "" };

export function currentInvoiceName() {
  return draft.name;
}

export async function flushInvoiceName() {
  if (!draft.id || draft.name.trim() === draft.saved) return;
  const result = await renameInvoice(draft.id, draft.name);
  if (result.success) draft.saved = draft.name.trim();
}

export function InvoiceNameField({ invoiceId, initialName }: { invoiceId?: string; initialName?: string }) {
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    draft.id = invoiceId ?? "";
    draft.name = initialName ?? "";
    draft.saved = initialName ?? "";
    setName(initialName ?? "");
    const persist = () => {
      void flushInvoiceName();
    };
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [invoiceId, initialName]);

  return (
    <input
      aria-label="Invoice name"
      value={name}
      placeholder="Name this invoice"
      className="w-full max-w-xl bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
      onChange={(event) => {
        draft.name = event.target.value;
        setName(event.target.value);
      }}
      onBlur={() => {
        void flushInvoiceName();
      }}
    />
  );
}
