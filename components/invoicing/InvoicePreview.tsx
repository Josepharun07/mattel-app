import { VersionBadge } from "@/components/documents/version-badge";
import { documentVersion } from "@/lib/engines/invoice-engine";
import { formatInr } from "@/lib/money";
import type { InvoiceTotals, LedgerItem } from "@/lib/invoicing/types";
import type { PaymentStatus } from "@/lib/billing/payments";
import { TermsBlock } from "@/components/invoicing/terms";

type InvoicePreviewProps = {
  companyName: string;
  tagline: string;
  clientName: string;
  clientAddress: string;
  invoiceNumber: string;
  issueDateLabel: string;
  dueDateLabel: string;
  items: LedgerItem[];
  totals: InvoiceTotals;
  gstEnabled: boolean;
  taxMode: "INTRA" | "INTER";
  stationeryMode: boolean;
  terms: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  phone: string;
  email: string;
  gstin: string;
  payments: {
    id: string;
    paymentDate: string;
    amountPaid: number;
    paymentMode: string;
    referenceNumber: string;
  }[];
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  bankName: string;
  institution?: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  managerDesignation: string;
};

export function InvoicePreview({
  companyName,
  tagline,
  clientName,
  clientAddress,
  invoiceNumber,
  issueDateLabel,
  dueDateLabel,
  items,
  totals,
  gstEnabled,
  taxMode,
  stationeryMode,
  terms,
  logoUrl,
  signatureUrl,
  phone,
  email,
  gstin,
  payments,
  amountPaid,
  balance,
  paymentStatus,
  bankName,
  institution = "",
  accountNumber,
  ifscCode,
  upiId,
  managerDesignation,
}: InvoicePreviewProps) {
  const contactLine = [phone, email, gstin ? `GSTIN ${gstin}` : ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("  ·  ");

  return (
    <article
      id="invoice-sheet"
      className="mx-auto box-border flex h-[842px] w-[595px] shrink-0 flex-col overflow-y-auto bg-white text-steel shadow-md"
      style={{
        paddingTop: stationeryMode ? "4.5cm" : "28px",
        paddingRight: "28px",
        paddingBottom: "28px",
        paddingLeft: "28px",
      }}
    >
      {stationeryMode ? null : (
        <header className="mb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="mb-3 h-10 w-auto object-contain" />
              ) : (
                <div className="mb-3 flex h-10 w-10 items-center justify-center bg-steel text-[10px] font-semibold tracking-wide text-white">
                  MI
                </div>
              )}
              <p className="text-lg font-semibold tracking-[0.14em]">
                {companyName.toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-steel/70">{tagline}</p>
            </div>
            <p className="font-mono text-xs">Date: {issueDateLabel}</p>
          </div>
          <div className="mt-4 border-t border-steel" />
        </header>
      )}

      <section className="mb-6 grid grid-cols-2 gap-6 text-xs">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-steel/50 uppercase">Billed to</p>
          <p className="mt-1 text-sm font-medium">{clientName || "Client name"}</p>
          <p className="mt-1 whitespace-pre-line text-steel/80">{clientAddress}</p>
        </div>
        <div className="text-right font-mono">
          {stationeryMode ? <p>Date: {issueDateLabel}</p> : null}
          <p className={stationeryMode ? "mt-2 flex items-center justify-end gap-2" : "flex items-center justify-end gap-2"}>
            Invoice #: {invoiceNumber}
            <VersionBadge version={documentVersion(invoiceNumber)} />
          </p>
          {dueDateLabel ? <p className="mt-2">Due: {dueDateLabel}</p> : null}
        </div>
      </section>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-steel/20 text-left">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-steel/50">
                Select unbilled rows to compile this invoice.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const overridden = item.overrideRate !== item.centralRate;
              return (
                <tr key={item.id} className="border-b border-steel/10">
                  <td className="py-2 pr-3">
                    <p>{item.materialName || "Untitled item"}</p>
                    <p className="text-[10px] text-steel/50">{item.unitType}</p>
                  </td>
                  <td className="py-2 text-right font-mono">{item.quantity}</td>
                  <td className="py-2 text-right font-mono">
                    {item.overrideRate.toFixed(2)}
                    {overridden ? "*" : ""}
                  </td>
                  <td className="py-2 text-right font-mono">{formatInr(item.totalPrice)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1 font-mono text-xs">
        <TotalRow label="Subtotal" value={formatInr(totals.subtotal)} />
        {gstEnabled && taxMode === "INTRA" ? (
          <>
            <TotalRow label="CGST (9%)" value={formatInr(totals.cgst)} />
            <TotalRow label="SGST (9%)" value={formatInr(totals.sgst)} />
          </>
        ) : null}
        {gstEnabled && taxMode === "INTER" ? (
          <TotalRow label="IGST (18%)" value={formatInr(totals.igst)} />
        ) : null}
        <div className="mt-2 flex justify-between border-t border-steel pt-2 text-sm font-semibold">
          <span>Grand Total</span>
          <span>{formatInr(totals.grandTotal)}</span>
        </div>
        <TotalRow label="Amount paid" value={formatInr(amountPaid)} />
        <TotalRow label="Balance" value={formatInr(balance)} />
        <p className="pt-1 text-right font-sans">{paymentStatus}</p>
      </div>

      {payments.length > 0 ? (
        <div className="mt-4 text-[11px]">
          <p className="font-medium">Payment history</p>
          <ul className="mt-1 space-y-1">
            {payments.map((payment) => (
              <li key={payment.id} className="flex justify-between font-mono">
                <span className="font-sans">
                  {payment.paymentDate} · {payment.paymentMode}
                  {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                </span>
                <span>{formatInr(payment.amountPaid)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8">
        <TermsBlock text={terms} />
      </div>

      <div className="mt-6 text-[11px]">
        <p className="font-medium">{bankName}</p>
        <p className="text-steel/70">
          {[institution, accountNumber ? `A/c ${accountNumber}` : "", ifscCode ? `IFSC ${ifscCode}` : "", upiId ? `UPI ${upiId}` : ""]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </div>

      <div className="mt-auto pt-10">
        <p className="text-xs">Sincerely Yours,</p>
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureUrl} alt="Signature" className="mt-2 h-16 w-auto bg-transparent object-contain" />
        ) : (
          <div className="mt-8 h-10 w-40 border-b border-dashed border-steel/30" />
        )}
        <p className="mt-2 text-xs">{managerDesignation}</p>
        <p className="text-xs font-medium">{companyName}</p>
      </div>

      {stationeryMode || contactLine.length === 0 ? null : (
        <footer className="mt-8 border-t border-steel/15 pt-3 text-center text-[10px] tracking-wide text-steel/60">
          {contactLine}
        </footer>
      )}
    </article>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
