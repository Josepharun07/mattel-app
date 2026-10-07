"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Layers, PlusCircle, Receipt } from "lucide-react";
import { resetEntryRateToCentral } from "@/actions/ledger-actions";
import { CompileInvoiceBar } from "@/components/projects/compile-invoice-bar";
import { EventIngestionModal } from "@/components/projects/event-ingestion-modal";
import { UnbilledLedgerTable } from "@/components/projects/unbilled-ledger-table";
import { Input } from "@/components/ui/input";
import {
  compileInvoiceHref,
  finalEventPrice,
  getUnbilledLedgerRows,
  selectedUnbilledValue,
  summarizeProjectLedger,
} from "@/lib/engines/ledger-engine";
import type { LedgerEntryView, ProjectLedger } from "@/lib/ledger/sample";
import {
  emptyLedgerSession,
  readLedgerSession,
  setLedgerRatePatch,
  subscribeLedgerSession,
  writeCompileDraft,
  writeLedgerSession,
} from "@/lib/ledger/session";
import { formatInr } from "@/lib/money";

export function ProjectEventTerminal({ initial, openOnServer }: { initial: ProjectLedger; openOnServer: number }) {
  const router = useRouter();
  const session = useSyncExternalStore(subscribeLedgerSession, readLedgerSession, () => emptyLedgerSession);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "CENTRAL_INVENTORY" | "DIRECT_PURCHASE">("ALL");
  const [draftRates, setDraftRates] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(
    initial.offline ? `Showing the sample book until PostgreSQL is connected. ${openOnServer} rows are unbilled on that book.` : "",
  );

  const merged = initial.entries.map((entry) => ({ ...entry }));
  for (const entry of session.entries) {
    if (entry.projectId === initial.project.id && !merged.some((row) => row.id === entry.id)) {
      merged.unshift(entry);
    }
  }
  const rated = merged.map((entry) => {
    const draft = draftRates[entry.id];
    const override =
      draft != null && draft.trim() !== "" && Number.isFinite(Number(draft))
        ? Number(draft)
        : (session.ratePatches[entry.id] ?? entry.overrideRate);
    return {
      ...entry,
      invoiceId: session.billedIds.includes(entry.id) ? entry.invoiceId ?? "session-invoice" : entry.invoiceId,
      overrideRate: override,
      finalPrice: finalEventPrice(entry.quantity, override),
    };
  });
  const stats = summarizeProjectLedger(rated);
  const openRows = getUnbilledLedgerRows(rated, initial.project.id, "PROJECT");
  const unbilled = openRows.filter((row) => (sourceFilter === "ALL" ? true : row.source === sourceFilter));
  const selectedRows = openRows.filter((row) => selected.includes(row.id));
  const selectedTotal = selectedUnbilledValue(selectedRows, selectedRows.map((row) => row.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll(ids: string[], select: boolean) {
    setSelected((current) => {
      if (select) {
        return [...new Set([...current, ...ids])];
      }
      const drop = new Set(ids);
      return current.filter((id) => !drop.has(id));
    });
  }

  function record(entry: LedgerEntryView) {
    const current = readLedgerSession();
    writeLedgerSession({ ...current, entries: [entry, ...current.entries] });
    setNotice(`${entry.description} is on the unbilled book.`);
  }

  function compile() {
    const rows = getUnbilledLedgerRows(rated, initial.project.id, "PROJECT").filter((row) => selected.includes(row.id));
    if (rows.length === 0) {
      return;
    }
    writeCompileDraft({
      projectId: initial.project.id,
      clientId: initial.project.clientId,
      entryIds: rows.map((row) => row.id),
      entries: rows,
      transitPassNo: rows.find((row) => row.transitPassNo)?.transitPassNo ?? "",
      ewayBillNo: rows.find((row) => row.ewayBillNo)?.ewayBillNo ?? "",
    });
    router.push(compileInvoiceHref(initial.project.id, rows.map((row) => row.id)));
  }

  return (
    <div className={selectedRows.length > 0 ? "space-y-5 pb-24" : "space-y-5"}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border bg-white p-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Layers className="size-4" /> Unbilled value</p>
          <p className="mt-2 font-mono text-xl font-semibold">{formatInr(stats.unbilledValue)}</p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Receipt className="size-4" /> Billed value</p>
          <p className="mt-2 font-mono text-xl font-semibold">{formatInr(stats.billedValue)}</p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Pending material draws</p>
          <p className="mt-2 text-xl font-semibold">{stats.pendingMaterialDraws}</p>
          <p className="text-xs text-muted-foreground">{stats.activeEventCount} open events</p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Project</p>
          <p className="mt-2 font-medium">{initial.project.name}</p>
          <p className="text-sm text-muted-foreground">{initial.project.clientName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.latestActivity ? `Latest activity ${format(parseISO(stats.latestActivity), "d MMM yyyy")}` : "No activity yet"}
          </p>
        </article>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={() => setOpen(true)}
        >
          <PlusCircle className="size-4" />
          Record site event / material draw
        </button>
        <Input
          className="max-w-sm"
          value={query}
          placeholder="Search material, vehicle, or transit pass"
          aria-label="Search material, vehicle, or transit pass"
          onChange={(event) => setQuery(event.target.value)}
        />
        {(["ALL", "CENTRAL_INVENTORY", "DIRECT_PURCHASE"] as const).map((source) => (
          <button
            key={source}
            type="button"
            className={`h-9 rounded-md border px-3 text-sm ${sourceFilter === source ? "bg-slate-900 text-white" : "bg-white"}`}
            onClick={() => setSourceFilter(source)}
          >
            {source === "ALL" ? "All sources" : source === "CENTRAL_INVENTORY" ? "Inventory draw" : "Direct"}
          </button>
        ))}
      </div>

      <UnbilledLedgerTable
        rows={unbilled}
        selectedIds={selected}
        query={query}
        rateInputs={draftRates}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onRateChange={(id, value) => setDraftRates((current) => ({ ...current, [id]: value }))}
        onRateCommit={(id, value) => {
          const rate = Number(value);
          if (Number.isFinite(rate) && rate >= 0) {
            setLedgerRatePatch(id, rate);
          }
          setDraftRates((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }}
        onResetRate={(row) => {
          setDraftRates((current) => {
            const next = { ...current };
            delete next[row.id];
            return next;
          });
          setLedgerRatePatch(row.id, row.centralRate);
          void resetEntryRateToCentral(row.id);
        }}
      />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <EventIngestionModal
        open={open}
        projectId={initial.project.id}
        clientId={initial.project.clientId}
        projectName={initial.project.name}
        clientName={initial.project.clientName}
        onClose={() => setOpen(false)}
        onRecorded={record}
      />
      <CompileInvoiceBar count={selectedRows.length} total={selectedTotal} onCompile={compile} />
    </div>
  );
}
