"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { updateBankDetails } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bankDetailsSchema } from "@/lib/settings/profile";
import type { z } from "zod";
import { Field } from "@/components/settings/company-profile-form";

type BankValues = z.infer<typeof bankDetailsSchema>;

export function BankDetailsForm({
  values,
  onSaved,
}: {
  values: BankValues;
  onSaved: (values: BankValues) => void;
}) {
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useForm<BankValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: values,
  });

  async function submit(next: BankValues) {
    setSaved(false);
    const savedValues = { ...next, ifscCode: next.ifscCode.toUpperCase() };
    const result = await updateBankDetails(savedValues);
    if (result.success || ("offline" in result && result.offline)) {
      onSaved(savedValues);
      setSaved(true);
    }
    setMessage(result.message);
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <Field label="Bank name" error={form.formState.errors.bankName?.message}>
        <Input {...form.register("bankName")} />
      </Field>
      <Field label="Account name" error={form.formState.errors.accountName?.message}>
        <Input {...form.register("accountName")} />
      </Field>
      <Field label="Account number" error={form.formState.errors.accountNumber?.message}>
        <Input {...form.register("accountNumber")} className="font-mono" />
      </Field>
      <Field label="IFSC" error={form.formState.errors.ifscCode?.message}>
        <Input {...form.register("ifscCode")} className="font-mono uppercase" />
      </Field>
      <Field label="UPI ID" className="md:col-span-2" error={form.formState.errors.upiId?.message}>
        <Input {...form.register("upiId")} placeholder="name@bank" />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>Save bank details</Button>
        {saved ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
