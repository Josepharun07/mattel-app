import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { listInvoiceFolders } from "@/models/invoice-board";
import { PickProject } from "@/views/invoices/pick-project";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const folders = await listInvoiceFolders();

  return (
    <PageFrame eyebrow="Invoices" title="Choose a project" description="The invoice is written for one project. Select it, then continue.">
      <PickProject projects={folders.map((folder) => ({ id: folder.id, name: folder.name, publicCode: folder.publicCode }))} />
    </PageFrame>
  );
}
