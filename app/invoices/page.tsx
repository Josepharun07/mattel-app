import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import Link from "next/link";
import { Folder } from "lucide-react";
import { listInvoiceFolders } from "@/models/invoice-board";
import { formatInr } from "@/lib/money";
import { PageFrame } from "@/views/shell/page-frame";
import { Button } from "@/views/ui/button";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const folders = await listInvoiceFolders();

  return (
    <PageFrame
      eyebrow="Work"
      title="Invoices"
      description="Each project keeps its own folder of every invoice recorded for it."
      width="wide"
      action={<Button asChild><Link href="/invoices/new">New invoice</Link></Button>}
    >
      {folders.length === 0 ? <p className="rounded-xl border bg-card px-4 py-8 text-sm text-muted-foreground">No projects yet.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {folders.map((folder) => (
          <Link key={folder.id} href={`/invoices/folder/${folder.id}`} className="flex flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <Folder className="size-4 text-neutral-700" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{folder.publicCode}</p>
                </div>
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{`${folder.count} ${folder.count === 1 ? "invoice" : "invoices"}`}</span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-wide text-neutral-500">Unpaid</p>
            <p className="text-lg font-semibold">{formatInr(folder.unpaid)}</p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
