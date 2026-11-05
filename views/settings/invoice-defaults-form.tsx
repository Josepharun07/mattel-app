"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { updateInvoiceDefaults } from "@/controllers/settings";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import { Label } from "@/views/ui/label";
import { Textarea } from "@/views/ui/textarea";
import { invoiceDefaultsSchema } from "@/lib/settings/profile";
import type { z } from "zod";

type DefaultsValues = z.infer<typeof invoiceDefaultsSchema>;

export function InvoiceDefaultsForm({
  values,
  onSaved,
}: {
  values: DefaultsValues;
  onSaved: (values: DefaultsValues) => void;
}) {
  const [message, setMessage] = useState("");
  const confirm = useConfirm();
  const [saved, setSaved] = useState(false);
  const form = useForm<DefaultsValues>({
    resolver: zodResolver(invoiceDefaultsSchema),
    defaultValues: values,
  });

  async function submit(next: DefaultsValues) {
    const accepted = await confirm({ title: "Save the invoice defaults?", detail: "New invoices start with these terms." });
    if (!accepted) return;
    setSaved(false);
    const result = await updateInvoiceDefaults(next);
    if (result.success || ("offline" in result && result.offline)) {
      onSaved(next);
      setSaved(true);
    }
    setMessage(result.message);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
      <label className="block">
        <Label className="mb-1.5 text-xs text-muted-foreground">Default payment terms</Label>
        <Textarea {...form.register("defaultTerms")} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>Save invoice defaults</Button>
        {saved ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
