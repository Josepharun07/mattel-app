"use client";

import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { updateCompanyProfile } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { companyProfileSchema } from "@/lib/settings/profile";
import type { z } from "zod";

type CompanyValues = z.infer<typeof companyProfileSchema>;

export function CompanyProfileForm({
  values,
  onSaved,
}: {
  values: CompanyValues;
  onSaved: (values: CompanyValues) => void;
}) {
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useForm<CompanyValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: values,
  });

  async function submit(next: CompanyValues) {
    setSaved(false);
    const result = await updateCompanyProfile(next);
    if (result.success || ("offline" in result && result.offline)) {
      onSaved(next);
      setSaved(true);
    }
    setMessage(result.message);
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <Field label="Company name" error={form.formState.errors.companyName?.message}>
        <Input {...form.register("companyName")} />
      </Field>
      <Field label="Tagline" error={form.formState.errors.tagline?.message}>
        <Input {...form.register("tagline")} />
      </Field>
      <Field label="Address" className="md:col-span-2" error={form.formState.errors.address?.message}>
        <Textarea {...form.register("address")} />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <Input {...form.register("phone")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </Field>
      <Field label="GSTIN" error={form.formState.errors.gstin?.message}>
        <Input {...form.register("gstin")} placeholder="15-character GSTIN" />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>Save company profile</Button>
        {saved ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}

export function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
