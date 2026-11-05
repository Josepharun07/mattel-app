"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { canGoBack, subscribeNavigation } from "@/lib/navigation/page-memory";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const history = useSyncExternalStore(subscribeNavigation, canGoBack, () => false);
  useEffect(() => setReady(true), []);
  if (!ready || !history) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Back"
      className="mt-0.5 shrink-0"
      onClick={() => router.back()}
    >
      <ArrowLeft />
    </Button>
  );
}
