import type { LedgerEntryView } from "@/lib/ledger/sample";

const storageKey = "mattel.ledger.session";
const eventName = "mattel-ledger-session";

export type LedgerCompileDraft = {
  projectId: string;
  clientId: string;
  entryIds: string[];
  entries: LedgerEntryView[];
  transitPassNo: string;
  ewayBillNo: string;
};

export type LedgerSession = {
  entries: LedgerEntryView[];
  billedIds: string[];
  ratePatches: Record<string, number>;
  compileDraft: LedgerCompileDraft | null;
};

export const emptyLedgerSession: LedgerSession = {
  entries: [],
  billedIds: [],
  ratePatches: {},
  compileDraft: null,
};

let raw = "";
let snapshot: LedgerSession = emptyLedgerSession;
let compileRaw = "";
let compileSnapshot: LedgerCompileDraft | null = null;

function normalize(parsed: Partial<LedgerSession>): LedgerSession {
  return {
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    billedIds: Array.isArray(parsed.billedIds) ? parsed.billedIds : [],
    ratePatches: parsed.ratePatches && typeof parsed.ratePatches === "object" ? parsed.ratePatches : {},
    compileDraft: parsed.compileDraft ?? null,
  };
}

export function readLedgerSession(): LedgerSession {
  if (typeof window === "undefined") {
    return emptyLedgerSession;
  }
  const next = sessionStorage.getItem(storageKey) ?? "";
  if (next === raw) {
    return snapshot;
  }
  raw = next;
  if (!next) {
    snapshot = emptyLedgerSession;
    return snapshot;
  }
  try {
    snapshot = normalize(JSON.parse(next) as Partial<LedgerSession>);
  } catch {
    snapshot = emptyLedgerSession;
  }
  return snapshot;
}

export function readCompileDraft(): LedgerCompileDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  const next = sessionStorage.getItem(storageKey) ?? "";
  if (next === compileRaw) {
    return compileSnapshot;
  }
  compileRaw = next;
  compileSnapshot = readLedgerSession().compileDraft;
  return compileSnapshot;
}

export function writeLedgerSession(next: LedgerSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  compileRaw = encoded;
  compileSnapshot = next.compileDraft;
  window.dispatchEvent(new Event(eventName));
}

export function subscribeLedgerSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function setLedgerRatePatch(id: string, rate: number) {
  const current = readLedgerSession();
  writeLedgerSession({
    ...current,
    ratePatches: { ...current.ratePatches, [id]: rate },
  });
}

export function writeCompileDraft(draft: LedgerCompileDraft) {
  const current = readLedgerSession();
  writeLedgerSession({ ...current, compileDraft: draft });
}

export function markLedgerEntriesBilled(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) {
    return;
  }
  const current = readLedgerSession();
  writeLedgerSession({
    ...current,
    billedIds: [...new Set([...current.billedIds, ...ids])],
    compileDraft: null,
  });
}
