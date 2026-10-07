import type { SubcontractDraw, SubcontractRecord } from "@/lib/subcontracts/types";

const storageKey = "mattel.subcontracts.session";
const eventName = "mattel-subcontracts-session";

export type SubcontractSession = {
  contracts: SubcontractRecord[];
  draws: SubcontractDraw[];
};

const emptySession: SubcontractSession = { contracts: [], draws: [] };
let raw = "";
let snapshot: SubcontractSession = emptySession;

export function readSubcontractSession(): SubcontractSession {
  if (typeof window === "undefined") {
    return emptySession;
  }
  const next = sessionStorage.getItem(storageKey) ?? "";
  if (next === raw) {
    return snapshot;
  }
  raw = next;
  if (!next) {
    snapshot = emptySession;
    return snapshot;
  }
  try {
    const parsed = JSON.parse(next) as SubcontractSession;
    snapshot = {
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
      draws: Array.isArray(parsed.draws) ? parsed.draws : [],
    };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

export function writeSubcontractSession(next: SubcontractSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

export function subscribeSubcontractSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function serverSubcontractSession(): SubcontractSession {
  return emptySession;
}
