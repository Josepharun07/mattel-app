"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "@/views/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/views/ui/dialog";

type Ask = { title: string; detail: string };

type Pending = Ask & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<(input: Ask) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback((input: Ask) => {
    return new Promise<boolean>((resolve) => setPending({ ...input, resolve }));
  }, []);

  function finish(value: boolean) {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) finish(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.title ?? "Continue?"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{pending?.detail}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => finish(false)}>Cancel</Button>
            <Button type="button" onClick={() => finish(true)}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
