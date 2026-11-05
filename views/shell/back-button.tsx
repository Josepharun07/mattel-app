"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { backDestination, leavePage, subscribeNavigation } from "@/lib/navigation/page-memory";
import { Button } from "@/views/ui/button";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const destination = useSyncExternalStore(subscribeNavigation, () => backDestination(pathname), () => null);
  useEffect(() => setReady(true), []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Back"
      className="mt-0.5 shrink-0"
      disabled={!ready || !destination}
      onClick={() => {
        const next = leavePage(pathname);
        if (next) router.push(next);
      }}
    >
      <ArrowLeft />
    </Button>
  );
}
