"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getStockLogs, type StockLogRow } from "@/actions/inventory-actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addsStock } from "@/lib/engines/inventory-engine";
import { readSessionStockLogs } from "@/lib/inventory/session-log";

export function MovementLog({ logs }: { logs: StockLogRow[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No stock movements have been recorded yet.</p>;
  }

  return (
    <div className="rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Before</TableHead>
            <TableHead>After</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{new Date(row.createdAt).toLocaleString("en-IN")}</TableCell>
              <TableCell>{row.itemName}</TableCell>
              <TableCell>
                <Badge tone={addsStock(row.changeType) ? "success" : "warning"}>
                  {addsStock(row.changeType) ? <ArrowDownLeft className="mr-1 size-3" /> : <ArrowUpRight className="mr-1 size-3" />}
                  {row.changeType.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{row.quantity}</TableCell>
              <TableCell className="font-mono">{row.previousStock}</TableCell>
              <TableCell className="font-mono">{row.newStock}</TableCell>
              <TableCell>{row.referenceId || row.notes || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        <Link href="/inventory" className="underline">
          Back to catalog
        </Link>
      </p>
    </div>
  );
}

export function MovementLogLoader() {
  const [serverLogs, setServerLogs] = useState<StockLogRow[] | null>(null);

  useEffect(() => {
    getStockLogs().then((serverLogs) => {
      const sessionLogs = readSessionStockLogs();
      const seen = new Set(serverLogs.map((row) => row.id));
      setServerLogs([...sessionLogs.filter((row) => !seen.has(row.id)), ...serverLogs]);
    });
  }, []);

  if (!serverLogs) {
    return <p className="text-sm text-muted-foreground">Loading stock movements…</p>;
  }

  return <MovementLog logs={serverLogs} />;
}
