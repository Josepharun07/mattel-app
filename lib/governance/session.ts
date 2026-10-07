const storageKey = "mattel.governance.session";
const eventName = "mattel-governance-session";

export type GovernanceSession = { hiddenIds: string[] };

const emptySession: GovernanceSession = { hiddenIds: [] };
let raw = "";
let snapshot: GovernanceSession = emptySession;

export function readGovernanceSession(): GovernanceSession {
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
    const parsed = JSON.parse(next) as Partial<GovernanceSession>;
    snapshot = { hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [] };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

export function writeGovernanceSession(next: GovernanceSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

export function serverGovernanceSession(): GovernanceSession {
  return emptySession;
}

export function subscribeGovernanceSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function hideGovernanceRows(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) {
    return;
  }
  const current = readGovernanceSession();
  writeGovernanceSession({ hiddenIds: [...new Set([...current.hiddenIds, ...ids])] });
}
