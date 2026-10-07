"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Bold, Italic, List, Plus, Trash2 } from "lucide-react";
import { VersionBadge } from "@/components/documents/version-badge";
import { InvoicePreview } from "@/components/invoicing/InvoicePreview";
import { prefixCurrentLine, wrapSelection } from "@/components/invoicing/terms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { summarizePayments } from "@/lib/billing/payments";
import { linesToLedgerItems } from "@/lib/invoicing/lines";
import { documentVersion } from "@/lib/engines/invoice-engine";
import { formatInvoiceNumber } from "@/lib/invoicing/numbering";
import {
  blankLine,
  createResortLines,
  createSeedLines,
  studioClients,
  studioProjects,
  type EditorLine,
} from "@/lib/invoicing/studio-data";
import { calculateInvoiceTotals } from "@/lib/invoicing/totals";
import type { InvoiceKind, TaxMode } from "@/lib/invoicing/types";
import { useWorkspace, type PaymentMode } from "@/lib/workspace/store";

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || 2026, (month || 1) - 1, day || 1);
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseIsoDate(value));
}

function readFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoad(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

export function SplitScreenEditor({
  documentKind = "CONSTRUCTION",
}: {
  documentKind?: InvoiceKind;
}) {
  const workspace = useWorkspace();
  const visibleProjects = studioProjects.filter((project) => project.invoiceType === documentKind);
  const openingProject = visibleProjects[0] ?? studioProjects[0];
  const openingClient =
    studioClients.find((client) => client.id === openingProject.clientId) ?? studioClients[0];
  const rateBook = workspace.inventory.filter((item) => !item.deletedAt);
  const unitTypes = workspace.settings.unitTypes;
  const termsRef = useRef<HTMLTextAreaElement>(null);
  const [clientId, setClientId] = useState(openingClient.id);
  const [projectId, setProjectId] = useState(openingProject.id);
  const [invoiceType] = useState<InvoiceKind>(documentKind);
  const [sequence, setSequence] = useState("1");
  const [clientName, setClientName] = useState(openingProject.clientName);
  const [clientAddress, setClientAddress] = useState(openingProject.address);
  const [issueDate, setIssueDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [lines, setLines] = useState<EditorLine[]>(
    documentKind === "RESORT" ? createResortLines : createSeedLines,
  );
  const [gstEnabled, setGstEnabled] = useState(true);
  const [taxMode, setTaxMode] = useState<TaxMode>("INTRA");
  const [stationeryMode, setStationeryMode] = useState(false);
  const [terms, setTerms] = useState(workspace.settings.defaultTerms);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const ledgerItems = useMemo(
    () =>
      linesToLedgerItems(
        lines.map((line) => ({
          id: line.id,
          selected: line.selected,
          materialName: line.materialName,
          quantity: Number(line.quantity) || 0,
          unitType: line.unitType,
          centralRate: line.centralRate,
          overrideRate: Number(line.overrideRate) || 0,
        })),
      ),
    [lines],
  );
  const totals = useMemo(
    () => calculateInvoiceTotals(ledgerItems, gstEnabled, taxMode),
    [ledgerItems, gstEnabled, taxMode],
  );
  const invoiceNumber = formatInvoiceNumber(
    invoiceType,
    Number(sequence) || 0,
    parseIsoDate(issueDate),
  );
  const invoicePayments = workspace.payments.filter(
    (payment) => payment.invoiceNumber === invoiceNumber,
  );
  const settlement = summarizePayments(totals.grandTotal, invoicePayments);
  const allSelected = lines.length > 0 && lines.every((line) => line.selected);

  const projectsForClient = visibleProjects.filter((project) => project.clientId === clientId);
  const clientsForDocument = studioClients.filter((client) =>
    visibleProjects.some((project) => project.clientId === client.id),
  );

  function updateLine(id: string, patch: Partial<EditorLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function applyClient(nextClientId: string) {
    const client = studioClients.find((item) => item.id === nextClientId);
    if (!client) {
      return;
    }
    setClientId(client.id);
    setClientName(client.name);
    setClientAddress(client.address);
    setPhone(client.phone);
    const project = visibleProjects.find((item) => item.clientId === client.id);
    if (project) {
      setProjectId(project.id);
    }
  }

  function applyProject(nextProjectId: string) {
    const project = studioProjects.find((item) => item.id === nextProjectId);
    if (!project) {
      return;
    }

    setProjectId(project.id);
    setClientName(project.clientName);
    setClientAddress(project.address);
  }

  function applyInventory(lineId: string, itemName: string) {
    const item = rateBook.find((entry) => entry.itemName === itemName);
    if (!item) {
      return;
    }

    updateLine(lineId, {
      materialName: item.itemName,
      unitType: item.unitType,
      centralRate: item.standardUnitRate,
      overrideRate: String(item.standardUnitRate),
    });
  }

  function applyTermsEdit(next: string, cursor: number) {
    setTerms(next);
    requestAnimationFrame(() => {
      const field = termsRef.current;
      if (!field) {
        return;
      }
      field.focus();
      field.setSelectionRange(cursor, cursor);
    });
  }

  function markTerms(before: string, after: string) {
    const field = termsRef.current;
    if (!field) {
      return;
    }
    const result = wrapSelection(terms, field.selectionStart, field.selectionEnd, before, after);
    applyTermsEdit(result.next, result.cursor);
  }

  return (
    <div className="grid min-h-[calc(100svh-3.5rem)] grid-cols-1 lg:h-[calc(100svh-3.5rem)] lg:grid-cols-2 lg:overflow-hidden">
      <section className="no-print space-y-5 overflow-y-auto border-b border-border p-5 lg:border-r lg:border-b-0">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Document studio
          </p>
          <h1 className="mt-1 text-xl font-semibold text-steel">
            {documentKind === "RESORT" ? "Resort lease invoice" : "New invoice"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {documentKind === "RESORT"
              ? "Manual lease billing. Nothing is generated in the background."
              : "Selected unbilled rows compile into the A4 preview. Rates come from central inventory."}
          </p>
        </div>

        <Panel title="Template / Project">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client">
              <Select value={clientId} onValueChange={applyClient}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientsForDocument.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project">
              <Select value={projectId} onValueChange={applyProject}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectsForClient.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Invoice type">
              <Input
                readOnly
                value={documentKind === "RESORT" ? "Resort · MI/RES" : "Construction · MI/CON"}
              />
            </Field>
            <Field label="Sequence">
              <Input
                inputMode="numeric"
                value={sequence}
                onChange={(event) => setSequence(event.target.value)}
              />
            </Field>
            <Field label="Number">
              <Input readOnly value={invoiceNumber} className="font-mono" />
            </Field>
          </div>
        </Panel>

        <Panel title="Billing & client details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name">
              <Input value={clientName} onChange={(event) => setClientName(event.target.value)} />
            </Field>
            <Field label="Issue date">
              <Input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea
                value={clientAddress}
                onChange={(event) => setClientAddress(event.target.value)}
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
            <Field label="GSTIN">
              <Input value={gstin} onChange={(event) => setGstin(event.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Dynamic item entry">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((line) => ({ ...line, selected: event.target.checked })),
                  )
                }
              />
              Select unbilled rows
            </label>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>
              <Plus />
              Add row
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const dirty = Number(line.overrideRate) !== line.centralRate;
              return (
                <div key={line.id} className="rounded-lg border bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(event) =>
                          updateLine(line.id, { selected: event.target.checked })
                        }
                      />
                      #{index + 1}
                    </label>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove row ${index + 1}`}
                      onClick={() =>
                        setLines((current) => current.filter((item) => item.id !== line.id))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-6">
                    <Field label="Inventory" className="md:col-span-2">
                      <Select
                        value={
                          rateBook.some((item) => item.itemName === line.materialName)
                            ? line.materialName
                            : undefined
                        }
                        onValueChange={(value) => applyInventory(line.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Fill from central rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {rateBook.map((item) => (
                            <SelectItem key={item.id} value={item.itemName}>
                              {item.itemName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Material" className="md:col-span-2">
                      <Input
                        value={line.materialName}
                        onChange={(event) =>
                          updateLine(line.id, { materialName: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Qty">
                      <Input
                        inputMode="decimal"
                        className="font-mono"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      />
                    </Field>
                    <Field label="Unit">
                      <Select
                        value={line.unitType}
                        onValueChange={(value) => updateLine(line.id, { unitType: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Central rate">
                      <Input readOnly className="font-mono" value={line.centralRate.toFixed(2)} />
                    </Field>
                    <Field label={dirty ? "Override *" : "Override"}>
                      <div className="flex gap-2">
                        <Input
                          inputMode="decimal"
                          className="font-mono"
                          value={line.overrideRate}
                          onChange={(event) =>
                            updateLine(line.id, { overrideRate: event.target.value })
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Reset to Central Value"
                          aria-label="Reset to central value"
                          onClick={() =>
                            updateLine(line.id, { overrideRate: String(line.centralRate) })
                          }
                        >
                          ↺
                        </Button>
                      </div>
                    </Field>
                    <Field label="Transit pass #">
                      <Input
                        value={line.transitPassNumber}
                        onChange={(event) =>
                          updateLine(line.id, { transitPassNumber: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="E-Way bill #">
                      <Input
                        value={line.ewayBillNumber}
                        onChange={(event) =>
                          updateLine(line.id, { ewayBillNumber: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Vehicle #">
                      <Input
                        value={line.vehicleNumber}
                        onChange={(event) =>
                          updateLine(line.id, { vehicleNumber: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Tax">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
              GST enabled
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={taxMode === "INTRA" ? "default" : "outline"}
                onClick={() => setTaxMode("INTRA")}
              >
                Intra · CGST + SGST
              </Button>
              <Button
                type="button"
                size="sm"
                variant={taxMode === "INTER" ? "default" : "outline"}
                onClick={() => setTaxMode("INTER")}
              >
                Inter · IGST
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Terms & document upload">
          <div className="mb-2 flex gap-2">
            <Button type="button" size="icon-sm" variant="outline" aria-label="Bold" onClick={() => markTerms("**", "**")}>
              <Bold />
            </Button>
            <Button type="button" size="icon-sm" variant="outline" aria-label="Italic" onClick={() => markTerms("*", "*")}>
              <Italic />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="List"
              onClick={() => {
                const field = termsRef.current;
                if (!field) {
                  return;
                }
                const result = prefixCurrentLine(terms, field.selectionStart);
                applyTermsEdit(result.next, result.cursor);
              }}
            >
              <List />
            </Button>
          </div>
          <Textarea
            ref={termsRef}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            className="min-h-24"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Logo">
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    readFile(file, setLogoUrl);
                  }
                }}
              />
            </Field>
            <Field label="Signature / stamp">
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    readFile(file, setSignatureUrl);
                  }
                }}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Payments">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const amountPaid = Number(paymentAmount);
              if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
                return;
              }
              workspace.addPayment({
                invoiceNumber,
                paymentDate: todayIso(),
                amountPaid,
                paymentMode,
                referenceNumber: paymentReference.trim(),
                notes: paymentNotes.trim(),
              });
              setPaymentAmount("");
              setPaymentReference("");
              setPaymentNotes("");
            }}
          >
            <Field label="Amount">
              <Input
                className="font-mono"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </Field>
            <Field label="Mode">
              <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference">
              <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
            </Field>
            <Field label="Notes">
              <Input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline">
                Record payment
              </Button>
            </div>
          </form>
          {invoicePayments.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {invoicePayments.map((payment) => (
                <li key={payment.id}>
                  {payment.paymentDate} · {payment.paymentMode} · {payment.amountPaid}
                  {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Print mode">
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={stationeryMode} onCheckedChange={setStationeryMode} />
            <span>
              <span className="font-medium">
                {stationeryMode ? "Pre-printed stationery" : "Digital header"}
              </span>
              <span className="mt-1 block text-muted-foreground">
                Stationery mode hides the logo and footer and offsets the A4 canvas by 4.5cm.
              </span>
            </span>
          </label>
        </Panel>
      </section>

      <section className="overflow-auto bg-canvas p-5">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Live A4 preview
            </p>
            <p className="flex items-center gap-2 font-mono text-sm">
              {invoiceNumber}
              <VersionBadge version={documentVersion(invoiceNumber)} />
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                document.title = invoiceNumber;
                window.print();
              }}
            >
              Download PDF
            </Button>
            <Button
              type="button"
              className="bg-action text-white hover:bg-action/90"
              onClick={() => window.print()}
            >
              Print invoice
            </Button>
          </div>
        </div>
        <motion.div
          key={stationeryMode ? "stationery" : "digital"}
          initial={{ opacity: 0.55, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <InvoicePreview
            companyName={workspace.settings.companyName}
            tagline={workspace.settings.tagline}
            clientName={clientName}
            clientAddress={clientAddress}
            invoiceNumber={invoiceNumber}
            issueDateLabel={formatDisplayDate(issueDate)}
            dueDateLabel={dueDate ? formatDisplayDate(dueDate) : ""}
            items={ledgerItems}
            totals={totals}
            gstEnabled={gstEnabled}
            taxMode={taxMode}
            stationeryMode={stationeryMode}
            terms={terms}
            logoUrl={logoUrl ?? workspace.settings.logoDataUrl}
            signatureUrl={signatureUrl ?? workspace.settings.signatureDataUrl}
            phone={phone || workspace.settings.phone}
            email={email || workspace.settings.email}
            gstin={gstin || workspace.settings.gstin}
            payments={invoicePayments}
            amountPaid={settlement.amountPaid}
            balance={settlement.balance}
            paymentStatus={settlement.paymentStatus}
            bankName={workspace.settings.accountName || workspace.settings.bankName}
            institution={workspace.settings.bankName}
            accountNumber={workspace.settings.accountNumber}
            ifscCode={workspace.settings.ifscCode}
            upiId={workspace.settings.upiId}
            managerDesignation={workspace.settings.managerDesignation}
          />
        </motion.div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
