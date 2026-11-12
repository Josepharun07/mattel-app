import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProject, listEntryMaterials } from "@/models/projects";
import { PickEntries } from "@/views/invoices/pick-entries";
import { PageFrame } from "@/views/shell/page-frame";

export const metadata: Metadata = { title: "Choose invoice lines" };

export default async function PickInvoiceEntriesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const denied = await gate("invoices.read");
  if (denied) return denied;
  const { projectId } = await params;
  const [record, materials] = await Promise.all([findProject(projectId), listEntryMaterials()]);
  if (!record.project) notFound();

  return (
    <PageFrame
      eyebrow="New invoice"
      title={record.project.name}
      description="Select the pending work entries for this invoice. Add a line here if it is not on the list yet."
      width="wide"
    >
      <PickEntries projectId={record.project.id} entries={record.entries} materials={materials} />
    </PageFrame>
  );
}
