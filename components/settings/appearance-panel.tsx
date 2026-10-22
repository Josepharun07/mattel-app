"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  accentById,
  accentPalette,
  choicesFor,
  effectiveAccent,
  isLowLevelRole,
  openAccentIds,
  type AccentId,
} from "@/lib/settings/appearance";
import { useWorkspace } from "@/lib/workspace/store";

export function AppearancePanel() {
  const workspace = useWorkspace();
  const current = workspace.users.find((person) => person.id === workspace.currentUserId) ?? workspace.users[0];
  const accent = accentById(effectiveAccent(current, workspace.roleColors));
  const choices = choicesFor(current, workspace.roleColors);
  const [notice, setNotice] = useState("");
  const superAdmin = workspace.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Signed in as</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The bar colour is personal. A low-level role wears the colour a super admin reserved for that role.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {workspace.users.map((person) => {
            const swatch = accentById(effectiveAccent(person, workspace.roleColors));
            const active = person.id === current.id;
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${active ? "border-transparent text-white" : "bg-white"}`}
                style={active ? { backgroundColor: swatch.hex } : undefined}
                onClick={() => workspace.switchUser(person.id)}
              >
                <span className="size-3 rounded-full" style={{ backgroundColor: swatch.hex }} />
                {person.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-medium">Your colour</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {current.name} is using {accent.name}. Printed invoices, payslips, and letters stay black on white.
        </p>
        {choices.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {choices.map((id) => {
              const color = accentById(id);
              const selected = current.colorId === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={color.name}
                  aria-pressed={selected}
                  className={`rounded-md border px-3 py-2 text-sm ${selected ? "text-white" : "bg-white"}`}
                  style={selected ? { backgroundColor: color.hex, borderColor: color.hex } : undefined}
                  onClick={() => setNotice(workspace.setOwnColor(id))}
                >
                  {color.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {isLowLevelRole(current.role)
              ? "This role colour is set by a super admin."
              : "A super admin has turned off colour changes for this person."}
          </p>
        )}
        {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      </div>

      {superAdmin ? (
        <div className="space-y-4 border-t pt-4">
          <div>
            <h2 className="font-medium">Low-level role colour</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Operators wear this colour. Managers and above cannot choose it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {accentPalette.map((color) => {
                const selected = workspace.roleColors.OPERATOR === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={`Reserve ${color.name}`}
                    className={`rounded-md border px-3 py-2 text-sm ${selected ? "text-white" : "bg-white"}`}
                    style={selected ? { backgroundColor: color.hex, borderColor: color.hex } : undefined}
                    onClick={() => workspace.setOperatorColor(color.id)}
                  >
                    {color.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-medium">People</h2>
            {workspace.users.map((person) => {
              const allowed = isLowLevelRole(person.role)
                ? [workspace.roleColors.OPERATOR]
                : openAccentIds(workspace.roleColors);
              return (
                <div key={person.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.role}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      Can change colour
                      <Switch
                        checked={person.canEditColor}
                        disabled={isLowLevelRole(person.role)}
                        onCheckedChange={(checked) => workspace.setMemberCanEdit(person.id, checked)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allowed.map((id) => {
                      const color = accentById(id);
                      const selected = effectiveAccent(person, workspace.roleColors) === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`rounded-md border px-2 py-1 text-xs ${selected ? "text-white" : "bg-white"}`}
                          style={selected ? { backgroundColor: color.hex, borderColor: color.hex } : undefined}
                          onClick={() => workspace.setMemberColor(person.id, id as AccentId)}
                        >
                          {color.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
