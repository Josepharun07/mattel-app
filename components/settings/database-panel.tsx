"use client";

import { useState } from "react";
import { getDatabaseStatus, type DatabaseStatus } from "@/actions/database-actions";

export function DatabasePanel({ initial }: { initial: DatabaseStatus }) {
  const [status, setStatus] = useState(initial);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    setStatus(await getDatabaseStatus());
    setChecking(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6e6e73]">
        The app connects with <span className="font-medium text-[#1d1d1f]">DATABASE_URL</span> from the server environment. Local Docker uses the value in <span className="font-medium text-[#1d1d1f]">.env</span>. Cloud beta replaces that value. This screen never stores or shows the password.
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] text-[#6e6e73]">Host</dt>
          <dd className="text-[#1d1d1f]">{status.host || "Not set"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#6e6e73]">Database</dt>
          <dd className="text-[#1d1d1f]">{status.database || "Not set"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#6e6e73]">Target</dt>
          <dd className="text-[#1d1d1f]">{status.mode === "local" ? "Local Docker" : status.mode === "hosted" ? "Hosted" : "Not configured"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#6e6e73]">Status</dt>
          <dd className="text-[#1d1d1f]">{status.connected ? "Connected" : "Not connected"}</dd>
        </div>
      </dl>
      <p className="text-sm text-[#6e6e73]">{status.message}</p>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--app-accent)" }}
        disabled={checking}
        onClick={() => void check()}
      >
        {checking ? "Checking…" : "Check connection"}
      </button>
    </div>
  );
}
