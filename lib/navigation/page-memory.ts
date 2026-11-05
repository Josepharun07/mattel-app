"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";

const stateMemory = new Map<string, unknown>();
const scrollMemory = new Map<string, number>();
let stack: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeNavigation(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canGoBack() {
  return stack.length > 1;
}

export function noteNavigation(pathname: string) {
  const current = stack[stack.length - 1];
  if (current === pathname) {
    return;
  }
  if (current) {
    scrollMemory.set(current, window.scrollY);
  }
  if (stack[stack.length - 2] === pathname) {
    stack.pop();
  } else {
    const earlier = stack.lastIndexOf(pathname);
    if (earlier >= 0) {
      stack = stack.slice(0, earlier + 1);
    } else {
      stack = [...stack, pathname];
    }
  }
  notify();
}

export function recallScroll(pathname: string) {
  return scrollMemory.get(pathname) ?? 0;
}

export function rememberScroll(pathname: string, top: number) {
  scrollMemory.set(pathname, top);
}

export function usePageState<T>(slot: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const pathname = usePathname();
  const key = `${pathname}::${slot}`;
  const [value, setValue] = useState<T>(() => {
    if (stateMemory.has(key)) {
      return stateMemory.get(key) as T;
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const set = useCallback(
    (action: SetStateAction<T>) => {
      setValue((current) => {
        const next = typeof action === "function" ? (action as (value: T) => T)(current) : action;
        stateMemory.set(key, next);
        return next;
      });
    },
    [key],
  );

  return [value, set];
}
