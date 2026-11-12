"use client";

import { useEffect, useRef, useState } from "react";
import { formatInr, roundMoney } from "@/lib/money";
import { BrandLogo } from "@/views/brand/logo";
import type { FolderInvoice } from "@/models/invoice-board";
import type { SystemSettingsView } from "@/lib/settings/profile";

const sheetPx = (210 / 25.4) * 96;

export function InvoiceHalfPreview({
  company,
  projectName,
  invoice,
}: {
  company: SystemSettingsView;
  projectName: string;
  invoice: FolderInvoice;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const apply = () => setScale(node.clientWidth / sheetPx);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="relative aspect-[210/148.5] overflow-hidden rounded-md border bg-white shadow-sm">
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: "210mm", transform: `scale(${scale})` }}>
        <article className="relative box-border w-[210mm] bg-white p-[14mm] text-[11px] text-neutral-900">
          <img src="/mattel-watermark.png" alt="" className="pointer-events-none absolute top-[148.5mm] left-1/2 w-[55%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-25" />
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
              <p className="mt-2 text-right font-mono text-[11px]">{invoice.invoiceNumber}</p>
              <p className="mt-1 text-left text-[11px]">{invoice.issueDate}</p>
            </div>
          </header>
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-neutral-100 p-3">
              <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">INVOICE TO</p>
              <p className="mt-1 font-medium">{invoice.clientName}</p>
              {invoice.clientAddress ? <p className="text-neutral-600">{invoice.clientAddress}</p> : null}
              {invoice.clientGstin ? <p className="text-neutral-600">GSTIN {invoice.clientGstin}</p> : null}
            </div>
            <div className="rounded-md bg-neutral-100 p-3">
              <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-500">PROJECT</p>
              <p className="mt-1 font-medium">{projectName}</p>
              {invoice.transitPassNo ? <p className="mt-2 text-neutral-600">{invoice.transitPassNo}</p> : null}
              {invoice.ewayBillNo ? <p className="text-neutral-600">{invoice.ewayBillNo}</p> : null}
            </div>
          </div>
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
              {invoice.lines.map((line, index) => (
                <tr key={`${line.name}-${index}`} className="border-b border-neutral-200">
                  <td className="py-2 text-neutral-500">{String(index + 1).padStart(2, "0")}</td>
                  <td className="py-2 font-medium">{line.name}</td>
                  <td className="py-2">{line.unit}</td>
                  <td className="py-2 text-right font-mono">{line.quantity}</td>
                  <td className="py-2 text-right font-mono">{formatInr(line.rate)}</td>
                  <td className="py-2 text-right font-mono font-medium">{formatInr(roundMoney(line.quantity * line.rate))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </div>
  );
}
