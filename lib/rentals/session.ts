import type { AssetStatus } from "@/lib/engines/rental-engine";
import type { RentalAssignment } from "@/lib/rentals/types";

const storageKey = "mattel.rentals.session";
const eventName = "mattel-rentals-session";

export type RentalSession = {
  assignments: RentalAssignment[];
  statuses: Record<string, AssetStatus>;
};

const emptySession: RentalSession = { assignments: [], statuses: {} };
let raw = "";
let snapshot: RentalSession = emptySession;

export function readRentalSession(): RentalSession {
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
    const parsed = JSON.parse(next) as RentalSession;
    snapshot = {
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      statuses: parsed.statuses ?? {},
    };
  } catch {
    snapshot = emptySession;
  }
  return snapshot;
}

export function writeRentalSession(next: RentalSession) {
  const encoded = JSON.stringify(next);
  sessionStorage.setItem(storageKey, encoded);
  raw = encoded;
  snapshot = next;
  window.dispatchEvent(new Event(eventName));
}

export function subscribeRentalSession(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function serverRentalSession() {
  return emptySession;
}
