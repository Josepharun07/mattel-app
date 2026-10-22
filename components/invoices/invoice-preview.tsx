"use client";

import type { InvoiceCompanyProfile } from "@/actions/invoice-actions";
import { VersionBadge } from "@/components/documents/version-badge";
import { calculateInvoiceTotals, documentVersion } from "@/lib/engines/invoice-engine";
import { formatInr } from "@/lib/money";
import { lineTotal, type InvoiceLine } from "@/components/invoices/line-items-grid";
import { useInvoiceStudio } from "@/components/invoices/invoice-form";

export function InvoicePreview({
  company,
  clientName,
  clientGstin,
  clientAddress,
  projectName,
  invoiceNumber,
  issueDate,
  transitPassNo,
  ewayBillNo,
  lines,
  gstEnabled,
  isInterstate,
  letterheadMode,
  terms,
  signatureUrl,
}: {
  company: InvoiceCompanyProfile;
  clientName: string;
  clientGstin: string | null;
  clientAddress: string | null;
  projectName: string;
  invoiceNumber: string;
  issueDate: string;
  transitPassNo: string;
  ewayBillNo: string;
  lines: InvoiceLine[];
  gstEnabled: boolean;
  isInterstate: boolean;
  letterheadMode: boolean;
  terms: string;
  signatureUrl: string | null;
}) {
  const totals = calculateInvoiceTotals(
    lines.map((line) => ({
      quantity: Number(line.quantity) || 0,
      centralRate: line.centralRate,
      overrideRate: line.overrideRate.trim() === "" ? undefined : Number(line.overrideRate),
    })),
    { gstEnabled, isInterstate },
  );
  const issueLabel = new Date(`${issueDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      id="invoice-sheet"
      className="mx-auto box-border flex min-h-[842px] w-full max-w-[595px] shrink-0 flex-col bg-white text-[11px] text-[#111111] shadow-xl"
      style={{
        paddingTop: letterheadMode ? "28px" : "4.5cm",
        paddingRight: "28px",
        paddingBottom: "28px",
        paddingLeft: "28px",
      }}
    >
      {letterheadMode ? (
        <header className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-4">
          <div>
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="mb-2 h-10 w-auto object-contain" />
            ) : (
              <div className="mb-2 flex h-10 w-10 items-center justify-center bg-neutral-900 text-[10px] font-semibold text-white">
                MI
              </div>
            )}
            <p className="text-sm font-semibold tracking-[0.12em]">{company.companyName.toUpperCase()}</p>
            <p className="mt-1 text-[10px] text-neutral-500">{company.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-wide">INVOICE</p>
            <p className="mt-1 flex items-center justify-end gap-2 font-mono">
              {invoiceNumber}
              <VersionBadge version={documentVersion(invoiceNumber)} />
            </p>
            <p className="mt-2">Date: {issueLabel}</p>
          </div>
        </header>
      ) : null}

      <div className="mt-5">
        <p className="text-[10px] tracking-[0.14em] text-neutral-500">RECIPIENT</p>
        <p className="mt-1 font-medium">{clientName || "Client"}</p>
        {clientGstin ? <p>GSTIN {clientGstin}</p> : null}
        {clientAddress ? <p>{clientAddress}</p> : null}
        {projectName ? <p className="mt-1">{projectName}</p> : null}
        {transitPassNo ? <p className="mt-2">Transit pass: {transitPassNo}</p> : null}
        {ewayBillNo ? <p>E-Way bill: {ewayBillNo}</p> : null}
      </div>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-steel">
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 font-medium">Unit</th>
            <th className="py-1 text-right font-medium">Qty</th>
            <th className="py-1 text-right font-medium">Rate</th>
            <th className="py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const override = line.overrideRate.trim() === "" ? undefined : Number(line.overrideRate);
            const rate = override ?? line.centralRate;
            return (
              <tr key={line.id} className="border-b border-border">
                <td className="py-1">{line.name || "—"}</td>
                <td className="py-1">{line.unitType}</td>
                <td className="py-1 text-right font-mono">{line.quantity || "0"}</td>
                <td className="py-1 text-right font-mono">{rate.toFixed(2)}</td>
                <td className="py-1 text-right font-mono">{formatInr(lineTotal(line))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto w-48 space-y-1">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd className="font-mono">{formatInr(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>CGST (9%)</dt>
          <dd className="font-mono">{formatInr(totals.cgst)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>SGST (9%)</dt>
          <dd className="font-mono">{formatInr(totals.sgst)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>IGST (18%)</dt>
          <dd className="font-mono">{formatInr(totals.igst)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-steel pt-1 font-semibold">
          <dt>Grand total</dt>
          <dd className="font-mono">{formatInr(totals.total)}</dd>
        </div>
      </dl>

      {terms ? <p className="mt-4 text-[10px]">{terms}</p> : null}

      <p className="mt-4 text-[10px]">
        <span className="font-medium">{company.accountName}</span>
        <span className="mt-1 block text-muted-foreground">
          {[company.bankName, company.accountNumber ? `A/c ${company.accountNumber}` : "", company.ifscCode ? `IFSC ${company.ifscCode}` : "", company.upiId ? `UPI ${company.upiId}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </p>

      {letterheadMode ? (
        <footer className="mt-auto pt-6">
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="Signature stamp" className="mb-2 h-12 w-auto bg-slate-100 object-contain p-1" />
          ) : (
            <div className="mb-6 h-10 w-28 border-b border-steel" />
          )}
          <p>Authorised Signatory</p>
          <p className="mt-4 border-t border-border pt-2 text-[10px]">
            {company.companyName} · {company.address} · {company.phone} · {company.email}
          </p>
        </footer>
      ) : (
        <div className="mt-8">
          <div className="h-10 w-28 border-b border-steel" />
          <p className="mt-1">Authorised Signatory</p>
        </div>
      )}
    </article>
  );
}

export function ConnectedPreview() {
  const studio = useInvoiceStudio();

  return (
    <InvoicePreview
      company={studio.data.company}
      clientName={studio.client?.name ?? ""}
      clientGstin={studio.client?.gstin ?? null}
      clientAddress={studio.client?.address ?? studio.project?.location ?? null}
      projectName={studio.project?.name ?? ""}
      invoiceNumber={studio.invoiceNumber}
      issueDate={studio.issueDate}
      transitPassNo={studio.transitPassNo}
      ewayBillNo={studio.ewayBillNo}
      lines={studio.lines}
      gstEnabled={studio.gstEnabled}
      isInterstate={studio.isInterstate}
      letterheadMode={studio.letterheadMode}
      terms={studio.terms}
      signatureUrl={studio.signatureUrl}
    />
  );
}
