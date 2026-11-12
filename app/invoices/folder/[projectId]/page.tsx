import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSystemSettings } from "@/controllers/settings";
import { findProject } from "@/models/projects";
import { listFolderInvoices } from "@/models/invoice-board";
import { formatInr } from "@/lib/money";
import { InvoiceHalfPreview } from "@/views/invoices/invoice-half-preview";
import { PageFrame } from "@/views/shell/page-frame";
import { Badge } from "@/views/ui/badge";
import { Button } from "@/views/ui/button";
import type { SystemSettingsView } from "@/lib/settings/profile";

function InvoiceGroup({ title, empty, invoices, company, projectName }: { title: string; empty: string; invoices: Awaited<ReturnType<typeof listFolderInvoices>>; company: SystemSettingsView; projectName: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      {invoices.length === 0 ? <p className="rounded-xl border bg-white px-4 py-6 text-sm text-muted-foreground">{empty}</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="group rounded-xl border bg-neutral-50 p-3 transition-shadow hover:shadow-md">
              <InvoiceHalfPreview company={company} projectName={projectName} invoice={invoice} />
              <div className="mt-3 space-y-1">
                <p className="truncate text-sm font-medium group-hover:underline">{invoice.invoiceName || "Untitled invoice"}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge tone={invoice.paymentStatus === "Paid" ? "success" : "warning"}>{invoice.paymentStatus}</Badge>
                  <span className="text-xs text-muted-foreground">Due {formatInr(invoice.unpaid)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export const metadata: Metadata = { title: "Project invoices" };

export default async function InvoiceFolderPage({ params }: { params: Promise<{ projectId: string }> }) {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const { projectId } = await params;
  const [record, invoices, company] = await Promise.all([findProject(projectId), listFolderInvoices(projectId), getSystemSettings()]);
  if (!record.project) notFound();

  return (
    <PageFrame
      eyebrow="Invoices"
      title={record.project.name}
      description={`${record.project.publicCode}. Every invoice recorded for this project.`}
      width="wide"
      action={<Button asChild><Link href={`/invoices/new/${record.project.id}`}>New invoice</Link></Button>}
    >
      <InvoiceGroup title="Draft" empty="No drafts." invoices={invoices.filter((invoice) => !invoice.finalized)} company={company} projectName={record.project.name} />
      <InvoiceGroup title="Finished" empty="No finished invoices." invoices={invoices.filter((invoice) => invoice.finalized)} company={company} projectName={record.project.name} />
    </PageFrame>
  );
}
