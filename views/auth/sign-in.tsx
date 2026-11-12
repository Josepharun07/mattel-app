"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordReset } from "@/controllers/account-controls";
import { signInAction } from "@/controllers/auth";
import { BrandLogo } from "@/views/brand/logo";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";

export function SignIn() {
  return (
    <Suspense fallback={null}>
      <SignInGate />
    </Suspense>
  );
}

function SignInGate() {
  const token = useSearchParams().get("token");
  if (token) return <ResetForm token={token} />;
  return <SignInForm />;
}

function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-paper"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const result = await completePasswordReset(token, password);
            setNotice(result.message);
            if (result.success) router.replace("/");
          })();
        }}
      >
        <BrandLogo className="h-12 w-auto" />
        <h1 className="font-serif text-2xl font-medium text-balance">Choose a new password</h1>
        <Input aria-label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" className="w-full">Update password</Button>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </form>
    </main>
  );
}

function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-paper"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            setPending(true);
            setNotice("");
            try {
              const result = await signInAction(username, password);
              if (result.ok) {
                window.location.assign("/");
                return;
              }
              setNotice(result.message);
            } catch {
              setNotice("Sign in could not be completed. Check the database connection on the server.");
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        <BrandLogo className="h-12 w-auto" />
        <h1 className="font-serif text-2xl font-medium text-balance">Mattel Infrastructures</h1>
        <p className="text-pretty text-sm leading-6 text-muted-foreground">
          Sign in to invoices, payroll, and the yard.
        </p>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="username">Email</Label>
          <Input id="username" type="email" autoComplete="email" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in" : "Sign in"}
        </Button>
        {notice ? <p className="text-sm text-destructive">{notice}</p> : null}
      </form>
    </main>
  );
}
