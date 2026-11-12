"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type ToastItem = { id: number; message: string; ok: boolean };

const ToastContext = createContext<(message: string, ok?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, ok }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-paper ${toast.ok ? "border-l-4 border-l-[#1f6b45]" : "border-l-4 border-l-destructive"}`}
          >
            <p className="text-pretty">
              <span className={`mr-2 inline-block size-2 translate-y-[-1px] rounded-full ${toast.ok ? "bg-[#30d158]" : "bg-[#ff453a]"}`} aria-hidden />
              {toast.message}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
