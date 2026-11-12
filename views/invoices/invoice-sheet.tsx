"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, finalizeInvoice, reviseFinishedInvoice, saveDraftInvoice } from "@/controllers/invoices";
import { currentInvoiceName, flushInvoiceName } from "@/views/invoices/invoice-name";
import { calculateInvoiceTotals } from "@/lib/engines/invoice-engine";
import { formatInr, roundMoney } from "@/lib/money";
import { BrandLogo } from "@/views/brand/logo";
import { Button } from "@/views/ui/button";
import { useConfirm } from "@/views/shell/confirm";
import type { SystemSettingsView } from "@/lib/settings/profile";

type Line = {
  id: string;
  projectEntryId?: string;
  name: string;
  unit: string;
  quantity: string;
  rate: string;
};

const field = "w-full bg-transparent text-inherit outline-none";

const firstPage = 7;
const laterPage = 12;

function paginateLines<T>(lines: T[]) {
  if (lines.length <= firstPage) return [lines];
  const pages = [lines.slice(0, firstPage)];
  for (let index = firstPage; index < lines.length; index += laterPage) {
    pages.push(lines.slice(index, index + laterPage));
  }
  return pages;
}

export function InvoiceSheet({
  company,
  projectId,
  projectName,
  clients,
  invoiceNumber,
  lines,
  invoiceId,
  finalized = false,
  initialClientId,
  initialDate,
  initialTransit,
  initialEway,
  initialTerms,
  initialGst,
  initialInterstate,
}: {
  company: SystemSettingsView;
  projectId: string;
  projectName: string;
  clients: { id: string; name: string; address: string; gstin: string }[];
  invoiceNumber: string;
  lines: Line[];
  invoiceId?: string;
  finalized?: boolean;
  initialClientId?: string;
  initialDate?: string;
  initialTransit?: string;
  initialEway?: string;
  initialTerms?: string;
  initialGst?: boolean;
  initialInterstate?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || "");
  const [number, setNumber] = useState(invoiceNumber);
  const [issueDate, setIssueDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [transit, setTransit] = useState(initialTransit ?? "");
  const [eway, setEway] = useState(initialEway ?? "");
  const [terms, setTerms] = useState(initialTerms ?? company.defaultTerms);
  const [gstEnabled, setGstEnabled] = useState(initialGst ?? true);
  const [interstate, setInterstate] = useState(initialInterstate ?? false);
  const [rows, setRows] = useState(lines);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const locked = finalized;
  const client = clients.find((item) => item.id === clientId);
  const totals = calculateInvoiceTotals(
    rows.map((line) => ({ quantity: Number(line.quantity) || 0, centralRate: Number(line.rate) || 0 })),
    { gstEnabled, isInterstate: interstate },
  );

  function update(id: string, patch: Partial<Line>) {
    setRows((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  async function save() {
    const accepted = await confirm({ title: "Save this invoice?", detail: "This stores the invoice and marks the selected work entries as billed." });
    if (!accepted) return;
    setSaving(true);
    await flushInvoiceName();
    const body = {
      invoiceNumber: number,
      invoiceType: "CON" as const,
      clientId,
      projectId,
      issueDate,
      transitPassNo: transit || undefined,
      ewayBillNo: eway || undefined,
      letterheadMode: true,
      gstEnabled,
      isInterstate: interstate,
      terms,
      asDraft: true,
      invoiceName: currentInvoiceName(),
      lines: rows.filter((line) => line.name.trim()).map((line) => ({
        projectEntryId: line.projectEntryId,
        name: line.name,
        quantity: Number(line.quantity),
        unitType: line.unit || "Unit",
        centralRate: Number(line.rate) || 0,
        overrideRate: Number(line.rate) || 0,
      })),
    };
    const result = invoiceId ? await saveDraftInvoice(invoiceId, body) : await createInvoice(body);
    setNotice(result.message);
    setSaving(false);
    if (result.success && !invoiceId && "data" in result && result.data?.id) router.push(`/invoices/${result.data.id}`);
  }

  async function finish() {
    if (!invoiceId) return;
    await flushInvoiceName();
    const accepted = await confirm({ title: "Finish this invoice?", detail: "A finished invoice cannot be edited. Later changes are saved as a new version." });
    if (!accepted) return;
    setSaving(true);
    const result = await finalizeInvoice(invoiceId);
    setNotice(result.message);
    setSaving(false);
    if (result.success) router.refresh();
  }

  async function revise() {
    if (!invoiceId) return;
    await flushInvoiceName();
    const accepted = await confirm({ title: "Edit as a new version?", detail: "The finished invoice stays as it is. A draft copy is opened with the next version on the invoice number." });
    if (!accepted) return;
    setSaving(true);
    const result = await reviseFinishedInvoice(invoiceId);
    setSaving(false);
    if (result.success) router.push(`/invoices/${result.data.id}`);
    else setNotice(result.message);
  }

  const pages = paginateLines(rows);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-center gap-4">
      <div className="flex flex-col gap-6">
      {pages.map((pageRows, pageIndex) => {
        const last = pageIndex === pages.length - 1;
        return (
      <article key={pageIndex} className="relative box-border flex h-[297mm] w-[210mm] shrink-0 flex-col overflow-hidden bg-white p-[14mm] text-[11px] text-neutral-900 shadow-xl">
        <img src="/mattel-watermark.png" alt="" aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 w-[55%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-25" />
        <header className="relative flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            {company.logoUrl ? <img src={company.logoUrl} alt="" className="h-20 w-auto object-contain" /> : <BrandLogo className="h-20 w-auto" alt="" />}
            <div>
              <p className="text-base font-semibold tracking-[0.14em]">{company.companyName.toUpperCase()}</p>
              <p className="mt-1 text-[11px] text-neutral-500">{company.tagline}</p>
            </div>
          </div>
          <div className="w-48">
            <p className="text-right text-4xl font-semibold tracking-tight">INVOICE</p>
            <p className="mt-2 text-right font-mono text-[11px]">{number}</p>
            <input aria-label="Issue date" type="date" readOnly={locked} className="mt-1 w-full border-b border-neutral-300 bg-transparent text-left text-[11px] outline-none" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
          </div>
        </header>
        {pageIndex === 0 ? (
        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-neutral-100 p-3">
            <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">INVOICE TO</p>
            <select aria-label="Client" disabled={locked} className={`${field} mt-1 font-medium`} value={clientId} onChange={(event) => setClientId(event.target.value)}>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {client?.address ? <p className="text-neutral-600">{client.address}</p> : null}
            {client?.gstin ? <p className="text-neutral-600">GSTIN {client.gstin}</p> : null}
          </div>
          <div className="rounded-md bg-neutral-100 p-3">
            <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">PROJECT</p>
            <p className="mt-1 font-medium">{projectName}</p>
            <input aria-label="Transit pass" readOnly={locked} className={`${field} mt-2`} placeholder="Transit pass" value={transit} onChange={(event) => setTransit(event.target.value)} />
            <input aria-label="E-Way bill" readOnly={locked} className={field} placeholder="E-Way bill" value={eway} onChange={(event) => setEway(event.target.value)} />
          </div>
        </div>
        ) : <p className="relative mt-3 text-[10px] text-neutral-500">{number} continued</p>}
        <table className="relative mt-5 w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-y border-neutral-900 text-[10px] uppercase tracking-wide">
              <th className="w-8 py-2 font-medium">No</th>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Unit</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((line, index) => {
              const total = roundMoney((Number(line.quantity) || 0) * (Number(line.rate) || 0));
              const lineNo = (pageIndex === 0 ? 0 : firstPage + (pageIndex - 1) * laterPage) + index + 1;
              return (
                <tr key={line.id} className="border-b border-neutral-200">
                  <td className="py-2 text-neutral-500">{String(lineNo).padStart(2, "0")}</td>
                  <td className="py-2"><input aria-label="Item" readOnly={locked} className={`${field} font-medium`} value={line.name} onChange={(event) => update(line.id, { name: event.target.value })} /></td>
                  <td className="py-2"><input aria-label="Unit" readOnly={locked} className={field} value={line.unit} onChange={(event) => update(line.id, { unit: event.target.value })} /></td>
                  <td className="py-2"><input aria-label="Quantity" readOnly={locked} className={`${field} text-right font-mono`} value={line.quantity} onChange={(event) => update(line.id, { quantity: event.target.value })} /></td>
                  <td className="py-2"><input aria-label="Rate" readOnly={locked} className={`${field} text-right font-mono`} value={line.rate} onChange={(event) => update(line.id, { rate: event.target.value })} /></td>
                  <td className="py-2 text-right font-mono font-medium">{formatInr(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="relative mt-auto pt-4">
        {last ? (
          <div className="grid grid-cols-[1.2fr_0.9fr] gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">PAYMENT</p>
                <p className="mt-1">{company.accountName}</p>
                <p className="text-neutral-600">{company.bankName}</p>
                <p className="text-neutral-600">{company.accountNumber ? `A/c ${company.accountNumber}` : ""} {company.ifscCode ? `· ${company.ifscCode}` : ""}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">TERMS</p>
                <textarea aria-label="Terms" readOnly={locked} className={`${field} mt-1 min-h-12 text-neutral-700`} value={terms} onChange={(event) => setTerms(event.target.value)} />
              </div>
            </div>
            <dl className="space-y-1 self-end">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono">{formatInr(totals.subtotal)}</dd></div>
              {gstEnabled && !interstate ? (
                <>
                  <div className="flex justify-between"><dt>CGST</dt><dd className="font-mono">{formatInr(totals.cgst)}</dd></div>
                  <div className="flex justify-between"><dt>SGST</dt><dd className="font-mono">{formatInr(totals.sgst)}</dd></div>
                </>
              ) : null}
              {gstEnabled && interstate ? <div className="flex justify-between"><dt>IGST</dt><dd className="font-mono">{formatInr(totals.igst)}</dd></div> : null}
              <div className="mt-2 flex justify-between bg-neutral-900 px-3 py-2 text-white"><dt>Total due</dt><dd className="font-mono font-semibold">{formatInr(totals.total)}</dd></div>
            </dl>
          </div>
        ) : null}
        <div className="mt-4 flex items-end justify-between border-t border-neutral-200 pt-2 text-[10px] text-neutral-500">
          <p>{company.companyName} · {company.address} · {company.phone}</p>
          <p>Page {pageIndex + 1} of {pages.length}</p>
        </div>
        </div>
      </article>
        );
      })}
      </div>
      <aside className="sticky top-4 w-40 shrink-0 space-y-2 rounded-xl border bg-card p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Tax</p>
        <button type="button" disabled={locked} className={`w-full rounded-md border px-2 py-1.5 ${gstEnabled ? "border-neutral-900 bg-white" : "bg-white"}`} onClick={() => setGstEnabled((value) => !value)}>{gstEnabled ? "GST on" : "GST off"}</button>
        <button type="button" disabled={locked} className={`w-full rounded-md border px-2 py-1.5 ${interstate ? "bg-white" : "border-neutral-900 bg-white"}`} onClick={() => setInterstate(false)}>Intra · CGST + SGST</button>
        <button type="button" disabled={locked} className={`w-full rounded-md border px-2 py-1.5 ${interstate ? "border-neutral-900 bg-white" : "bg-white"}`} onClick={() => setInterstate(true)}>Inter · IGST</button>
      </aside>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{notice}</p>
        {locked ? (
          <Button type="button" disabled={saving} onClick={() => void revise()}>Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving || !clientId} onClick={() => void save()}>{saving ? "Saving" : "Save draft"}</Button>
            {invoiceId ? <Button type="button" disabled={saving} onClick={() => void finish()}>Finish</Button> : null}
          </div>
        )}
      </div>
    </div>
  );
}
