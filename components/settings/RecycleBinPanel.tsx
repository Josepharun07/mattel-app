"use client";

import { useState } from "react";
import { purgeSoftDeletedRecord, restoreSoftDeletedRecord } from "@/app/actions/recycle-bin";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace/store";

const serverRecords = [
  {
    table: "clients" as const,
    recordId: "11111111-1111-4111-8111-111111111111",
    label: "ABC Constructions",
    source: "database" as const,
  },
  {
    table: "invoices" as const,
    recordId: "22222222-2222-4222-8222-222222222222",
    label: "MI/CON/2026/0004",
    source: "database" as const,
  },
  {
    table: "assets" as const,
    recordId: "33333333-3333-4333-8333-333333333333",
    label: "Plate compactor PC-12",
    source: "database" as const,
  },
];

export function RecycleBinPanel() {
  const workspace = useWorkspace();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const superAdmin = workspace.role === "SUPER_ADMIN";

  const localRecords = [
    ...workspace.inventory
      .filter((item) => item.deletedAt)
      .map((item) => ({
        table: "central_inventory" as const,
        recordId: item.id,
        label: item.itemName,
        source: "workspace" as const,
      })),
    ...workspace.assets
      .filter((item) => item.deletedAt)
      .map((item) => ({
        table: "assets" as const,
        recordId: item.id,
        label: item.assetName,
        source: "workspace" as const,
      })),
    ...workspace.subcontracts
      .filter((item) => item.deletedAt)
      .map((item) => ({
        table: "subcontracts" as const,
        recordId: item.id,
        label: item.title,
        source: "workspace" as const,
      })),
  ];

  async function restore(table: string, recordId: string, source: "workspace" | "database") {
    setPendingId(recordId);
    setNotice("");
    if (source === "workspace" && (table === "central_inventory" || table === "assets" || table === "subcontracts")) {
      workspace.restoreRecord(table, recordId);
      setPendingId(null);
      setNotice("Archived record restored.");
      return;
    }
    const result = await restoreSoftDeletedRecord(table, recordId);
    setPendingId(null);
    setNotice(result.message);
  }

  async function purge(table: string, recordId: string, source: "workspace" | "database") {
    setPendingId(recordId);
    setNotice("");
    if (source === "workspace" && (table === "central_inventory" || table === "assets" || table === "subcontracts")) {
      const removed = workspace.purgeRecord(table, recordId);
      setPendingId(null);
      setNotice(removed ? "Record permanently removed from this workspace." : "Only a Super Admin can purge records.");
      return;
    }
    const result = await purgeSoftDeletedRecord(table, recordId, workspace.role);
    setPendingId(null);
    setNotice(result.message);
  }

  const records = [...localRecords, ...serverRecords];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {superAdmin
          ? "Super Admin can restore or permanently purge."
          : "Operator access restores archived items. Switch to Super Admin in settings to purge."}
      </p>
      <ul className="divide-y rounded-xl border bg-white">
        {records.map((record) => (
          <li key={`${record.source}-${record.recordId}`} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{record.label}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {record.table} · {record.source}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pendingId === record.recordId}
                onClick={() => restore(record.table, record.recordId, record.source)}
              >
                Restore
              </Button>
              {superAdmin ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pendingId === record.recordId}
                  onClick={() => purge(record.table, record.recordId, record.source)}
                >
                  Purge
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
