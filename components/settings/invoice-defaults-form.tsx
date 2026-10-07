"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { updateInvoiceDefaults } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  const [saved, setSaved] = useState(false);
  const form = useForm<DefaultsValues>({
    resolver: zodResolver(invoiceDefaultsSchema),
    defaultValues: values,
  });

  async function submit(next: DefaultsValues) {
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
      <Controller
        control={form.control}
        name="defaultStationeryMode"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
            <span>
              <span className="block text-sm font-medium">
                {field.value ? "Digital header" : "4.5cm pre-printed letterhead"}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Digital header prints the logo and company block. Pre-printed mode offsets the sheet by 4.5cm.
              </span>
            </span>
            <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Digital header default" />
          </div>
        )}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>Save invoice defaults</Button>
        {saved ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
