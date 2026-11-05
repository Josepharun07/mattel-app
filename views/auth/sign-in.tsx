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
    <main className="flex min-h-svh items-center justify-center bg-[#F4F7FB] px-4">
      <form
        className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const result = await completePasswordReset(token, password);
            setNotice(result.message);
            if (result.success) router.replace("/");
          })();
        }}
      >
        <BrandLogo className="h-16 w-auto" />
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <Input aria-label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" className="w-full">Update password</Button>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </form>
    </main>
  );
}

function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F4F7FB] px-4">
      <form
        className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const result = await signInAction(username, password);
            if (result.ok) {
              router.refresh();
              return;
            }
            setNotice(result.message);
          })();
        }}
      >
        <BrandLogo className="h-16 w-auto" />
        <h1 className="text-2xl font-semibold tracking-tight">Mattel Infrastructures</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Sign in with an account stored in the local database. Passwords are hashed. The same usernames work until cloud beta replaces the database URL.
        </p>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </form>
    </main>
  );
}
