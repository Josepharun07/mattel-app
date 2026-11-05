"use client";

import { createContext, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { createInvoice, getNextInvoiceNumber, type InvoiceStudioData } from "@/actions/invoice-actions";
import { VersionBadge } from "@/components/documents/version-badge";
import { documentVersion } from "@/lib/engines/invoice-engine";
import { useWorkspace } from "@/lib/workspace/store";
import { usePageState } from "@/lib/navigation/page-memory";
import { LineItemsGrid, type InvoiceLine } from "@/components/invoices/line-items-grid";
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

type InvoiceStudioContextValue = {
  data: InvoiceStudioData;
  clientId: string;
  setClientId: (id: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  invoiceType: "CON" | "RES";
  setInvoiceType: (type: "CON" | "RES") => void;
  invoiceNumber: string;
  issueDate: string;
  setIssueDate: (value: string) => void;
  transitPassNo: string;
  setTransitPassNo: (value: string) => void;
  ewayBillNo: string;
  setEwayBillNo: (value: string) => void;
  gstEnabled: boolean;
  setGstEnabled: (value: boolean) => void;
  isInterstate: boolean;
  setInterstate: (value: boolean) => void;
  terms: string;
  setTerms: (value: string) => void;
  signatureUrl: string | null;
  setSignatureFile: (file: File | null) => void;
  lines: InvoiceLine[];
  setLines: (lines: InvoiceLine[]) => void;
  projectsForClient: InvoiceStudioData["projects"];
  client: InvoiceStudioData["clients"][number] | undefined;
  project: InvoiceStudioData["projects"][number] | undefined;
  saving: boolean;
  saveMessage: string;
  saveInvoice: () => void;
};

const InvoiceStudioContext = createContext<InvoiceStudioContextValue | null>(null);

export function useInvoiceStudio() {
  const value = useContext(InvoiceStudioContext);
  if (!value) {
    throw new Error("Invoice studio controls must render inside InvoiceStudioProvider.");
  }
  return value;
}

function openingLine(data: InvoiceStudioData): InvoiceLine {
  const item = data.inventory[0];
  return {
    id: "line-1",
    inventoryItemId: item?.id ?? "",
    name: item?.name ?? "",
    quantity: "1",
    unitType: item?.unitType ?? data.unitTypes[0] ?? "CFT",
    centralRate: item?.centralRate ?? 0,
    overrideRate: item ? String(item.centralRate) : "",
  };
}

export function InvoiceStudioProvider({
  data,
  initialInvoiceNumber,
  children,
}: {
  data: InvoiceStudioData;
  initialInvoiceNumber: string;
  children: ReactNode;
}) {
  const openingClient = data.clients[0];
  const openingProject = data.projects.find((project) => project.clientId === openingClient?.id);
  const [clientId, setClientIdState] = usePageState("client", openingClient?.id || "");
  const [projectId, setProjectId] = usePageState("project", openingProject?.id || "");
  const [invoiceType, setInvoiceTypeState] = usePageState<"CON" | "RES">("series", "CON");
  const [invoiceNumber, setInvoiceNumber] = usePageState("number", initialInvoiceNumber);
  const [issueDate, setIssueDate] = usePageState("issued", () => new Date().toISOString().slice(0, 10));
  const [transitPassNo, setTransitPassNo] = usePageState("transit", "");
  const [ewayBillNo, setEwayBillNo] = usePageState("eway", "");
  const [gstEnabled, setGstEnabled] = usePageState("gst", true);
  const [isInterstate, setInterstate] = usePageState("interstate", false);
  const [terms, setTerms] = usePageState("terms", data.company.defaultTerms || "Payment due within 15 days of issue.");
  const [signatureUrl, setSignatureUrl] = usePageState<string | null>("signature", data.company.signatureUrl);
  const [lines, setLines] = usePageState<InvoiceLine[]>("lines", [openingLine(data)]);
  const workspace = useWorkspace();
  const settingsStamp = [
    workspace.settings.defaultTerms,
    workspace.settings.signatureDataUrl ?? "",
    workspace.settings.unitTypes.join("|"),
  ].join("§");
  const [seenSettings, setSeenSettings] = usePageState("settings-stamp", "");
  if (settingsStamp !== seenSettings) {
    setSeenSettings(settingsStamp);
    setTerms(workspace.settings.defaultTerms || data.company.defaultTerms);
    if (workspace.settings.signatureDataUrl) {
      setSignatureUrl(workspace.settings.signatureDataUrl);
    }
  }
  const [saving, startSaving] = useTransition();
  const [numberPending, startNumber] = useTransition();
  const [saveMessage, setSaveMessage] = useState("");

  const projectsForClient = useMemo(
    () => data.projects.filter((project) => project.clientId === clientId),
    [data.projects, clientId],
  );
  const client = data.clients.find((entry) => entry.id === clientId);
  const project = data.projects.find((entry) => entry.id === projectId);
  const studioData: InvoiceStudioData = {
    ...data,
    unitTypes: workspace.settings.unitTypes.length > 0 ? workspace.settings.unitTypes : data.unitTypes,
    company: {
      ...data.company,
      logoUrl: workspace.settings.logoDataUrl || data.company.logoUrl,
      signatureUrl: workspace.settings.signatureDataUrl || data.company.signatureUrl,
    },
  };

  function setClientId(nextClientId: string) {
    setClientIdState(nextClientId);
    const nextProject = data.projects.find((entry) => entry.clientId === nextClientId);
    setProjectId(nextProject?.id ?? "");
  }

  function setInvoiceType(type: "CON" | "RES") {
    setInvoiceTypeState(type);
    startNumber(async () => {
      setInvoiceNumber(await getNextInvoiceNumber(type, issueDate));
    });
  }

  function changeIssueDate(value: string) {
    setIssueDate(value);
    if (value.slice(0, 4) !== issueDate.slice(0, 4)) {
      startNumber(async () => {
        setInvoiceNumber(await getNextInvoiceNumber(invoiceType, value));
      });
    }
  }

  function setSignatureFile(file: File | null) {
    if (!file) {
      setSignatureUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  function saveInvoice() {
    setSaveMessage("");
    startSaving(async () => {
      const result = await createInvoice({
        invoiceNumber,
        invoiceType,
        clientId,
        projectId: projectId || undefined,
        issueDate,
        transitPassNo: transitPassNo || undefined,
        ewayBillNo: ewayBillNo || undefined,
        letterheadMode: true,
        gstEnabled,
        isInterstate,
        terms,
        lines: lines
          .filter((line) => line.name.trim())
          .map((line) => ({
            inventoryItemId: /^[0-9a-f-]{36}$/i.test(line.inventoryItemId)
              ? line.inventoryItemId
              : undefined,
            name: line.name,
            quantity: Number(line.quantity),
            unitType: line.unitType,
            centralRate: line.centralRate,
            overrideRate:
              line.overrideRate.trim() === "" ? undefined : Number(line.overrideRate),
          })),
      });
      setSaveMessage(result.message);
      if (result.success) {
        setInvoiceNumber(await getNextInvoiceNumber(invoiceType, issueDate));
      }
    });
  }

  return (
    <InvoiceStudioContext.Provider
      value={{
        data: studioData,
        clientId,
        setClientId,
        projectId,
        setProjectId,
        invoiceType,
        setInvoiceType,
        invoiceNumber,
        issueDate,
        setIssueDate: changeIssueDate,
        transitPassNo,
        setTransitPassNo,
        ewayBillNo,
        setEwayBillNo,
        gstEnabled,
        setGstEnabled,
        isInterstate,
        setInterstate,
        terms,
        setTerms,
        signatureUrl,
        setSignatureFile,
        lines,
        setLines,
        projectsForClient,
        client,
        project,
        saving: saving || numberPending,
        saveMessage,
        saveInvoice,
      }}
    >
      {children}
    </InvoiceStudioContext.Provider>
  );
}

export function InvoiceForm() {
  const studio = useInvoiceStudio();

  return (
    <form
      className="no-print space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        studio.saveInvoice();
      }}
    >
      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-medium">Client and document</h2>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <Label>Client</Label>
          <Select value={studio.clientId || undefined} onValueChange={studio.setClientId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {studio.data.clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <Label>Project</Label>
          <Select value={studio.projectId || undefined} onValueChange={studio.setProjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {studio.projectsForClient.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <Label>Series</Label>
          <Select value={studio.invoiceType} onValueChange={(value) => studio.setInvoiceType(value as "CON" | "RES")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CON">Construction · MI/CON</SelectItem>
              <SelectItem value="RES">Resort · MI/RES</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <Label htmlFor="invoice-number">Invoice number</Label>
          <div className="flex items-center gap-2">
            <Input id="invoice-number" readOnly value={studio.invoiceNumber} />
            <VersionBadge version={documentVersion(studio.invoiceNumber)} />
          </div>
        </label>
        <label className="space-y-1 text-sm">
          <Label htmlFor="issue-date">Issue date</Label>
          <Input
            id="issue-date"
            type="date"
            value={studio.issueDate}
            onChange={(event) => studio.setIssueDate(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <Label htmlFor="transit-pass">Transit pass #</Label>
          <Input
            id="transit-pass"
            value={studio.transitPassNo}
            onChange={(event) => studio.setTransitPassNo(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <Label htmlFor="eway-bill">E-Way bill #</Label>
          <Input
            id="eway-bill"
            value={studio.ewayBillNo}
            onChange={(event) => studio.setEwayBillNo(event.target.value)}
          />
        </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <LineItemsGrid
          lines={studio.lines}
          catalog={studio.data.inventory}
          unitTypes={studio.data.unitTypes}
          onChange={studio.setLines}
        />
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-medium">Tax</h2>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="gst-enabled">GST enabled</Label>
          <Switch id="gst-enabled" checked={studio.gstEnabled} onCheckedChange={studio.setGstEnabled} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={studio.isInterstate ? "outline" : "default"}
            size="sm"
            onClick={() => studio.setInterstate(false)}
          >
            Intra · CGST + SGST
          </Button>
          <Button
            type="button"
            variant={studio.isInterstate ? "default" : "outline"}
            size="sm"
            onClick={() => studio.setInterstate(true)}
          >
            Inter · IGST
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-medium">Notes and stamp</h2>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="terms">Terms</Label>
          <Textarea id="terms" value={studio.terms} onChange={(event) => studio.setTerms(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <Label htmlFor="signature">Signature stamp</Label>
          <Input
            id="signature"
            type="file"
            accept="image/*"
            onChange={(event) => studio.setSignatureFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="submit" disabled={studio.saving || studio.lines.length === 0}>
          Save invoice
        </Button>
        {studio.saveMessage ? <p className="text-sm text-muted-foreground">{studio.saveMessage}</p> : null}
      </div>
    </form>
  );
}
