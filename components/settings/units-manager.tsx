"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateUnitTypes } from "@/actions/settings-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUnitTypes } from "@/lib/settings/profile";

export function UnitsManager({
  unitTypes,
  onSaved,
}: {
  unitTypes: string[];
  onSaved: (unitTypes: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  async function persist(next: string[]) {
    const result = await updateUnitTypes(next);
    if (result.success || ("offline" in result && result.offline)) {
      onSaved(normalizeUnitTypes(next));
    }
    setMessage(result.message);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const next = normalizeUnitTypes([...unitTypes, draft]);
    if (next.length === unitTypes.length) {
      setMessage("That unit is already on the list.");
      return;
    }
    setDraft("");
    await persist(next);
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {unitTypes.map((unit) => (
          <li key={unit}>
            <Badge className="gap-1 py-1 pr-1">
              {unit}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-slate-200"
                aria-label={`Remove ${unit}`}
                onClick={() => void persist(unitTypes.filter((item) => item !== unit))}
              >
                <Trash2 className="size-3" />
              </button>
            </Badge>
          </li>
        ))}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(event) => void add(event)}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Sqm, CuM, Kgs"
          aria-label="New measurement unit"
        />
        <Button type="submit" variant="outline">
          <Plus />
          Add unit
        </Button>
      </form>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
