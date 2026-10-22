"use client";

import { useSyncExternalStore } from "react";
import { signInLocal, type AuthSession } from "@/lib/auth/local";

const storageKey = "mattel.auth.session";
const eventName = "mattel-auth-session";

let snapshot: AuthSession | null = null;
let hydrated = false;

function read(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!hydrated) {
    hydrated = true;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        snapshot = JSON.parse(raw) as AuthSession;
      } catch {
        snapshot = null;
      }
    }
  }
  return snapshot;
}

function commit(next: AuthSession | null) {
  snapshot = next;
  if (next) {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } else {
    window.localStorage.removeItem(storageKey);
  }
  window.dispatchEvent(new Event(eventName));
}

function subscribe(onStoreChange: () => void) {
  const notify = () => onStoreChange();
  window.addEventListener(eventName, notify);
  return () => window.removeEventListener(eventName, notify);
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function signIn(username: string, password: string) {
  const result = signInLocal(username, password);
  if (result.ok) {
    commit(result.session);
  }
  return result;
}

export function signOut() {
  commit(null);
}
