"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isoDate } from "@/lib/dates";

const STORAGE_KEY = "mattel-infrastructures.workspace.v1";

export type SessionRole = "OPERATOR" | "SUPER_ADMIN";
export type PaymentMode = "UPI" | "Bank Transfer" | "Cash";
export type AttendanceMark = "FULL" | "HALF" | "ABSENT";

export type CompanySettings = {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  defaultTerms: string;
  defaultStationeryMode: boolean;
  unitTypes: string[];
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  managerDesignation: string;
};

export type InventoryRow = {
  id: string;
  itemName: string;
  unitType: string;
  standardUnitRate: number;
  currentStock: number;
  minSafetyThreshold: number;
  deletedAt: string | null;
};

export type AssetRow = {
  id: string;
  assetName: string;
  assetCode: string;
  status: "Available" | "Assigned" | "Maintenance";
  deletedAt: string | null;
};

export type AssignmentRow = {
  id: string;
  assetId: string;
  assigneeType: "INTERNAL_EMPLOYEE" | "EXTERNAL_RENTER";
  employeeName: string;
  externalName: string;
  externalPhone: string;
  externalIdDetails: string;
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate: string;
};

export type WorkerRow = {
  id: string;
  name: string;
  dailyRate: number;
  hourlyRate: number;
};

export type AttendanceRow = {
  id: string;
  workerId: string;
  workDate: string;
  mark: AttendanceMark;
  overtimeHours: number;
};

export type SubcontractRow = {
  id: string;
  title: string;
  projectTitle: string;
  leadPersonType: "INTERNAL_EMPLOYEE" | "EXTERNAL_CONTRACTOR";
  leadName: string;
  leadPhone: string;
  teamMembers: string[];
  totalContractAmount: number;
  deletedAt: string | null;
};

export type DrawRow = {
  id: string;
  subcontractId: string;
  drawDate: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  notes: string;
};

export type PaymentRow = {
  id: string;
  invoiceNumber: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  notes: string;
};

type WorkspaceState = {
  settings: CompanySettings;
  role: SessionRole;
  inventory: InventoryRow[];
  assets: AssetRow[];
  assignments: AssignmentRow[];
  workers: WorkerRow[];
  attendance: AttendanceRow[];
  subcontracts: SubcontractRow[];
  draws: DrawRow[];
  payments: PaymentRow[];
};

const defaultSettings: CompanySettings = {
  companyName: "Mattel Infrastructures",
  tagline: "Building Tomorrow's Foundation",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  bankName: "State Bank of India",
  accountName: "Mattel Infrastructures Operating Account",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  defaultTerms: "Payment due within 15 days of issue.",
  defaultStationeryMode: false,
  unitTypes: ["Loads", "Bags", "CFT", "Tons", "Hours", "Days", "Trips"],
  logoDataUrl: null,
  signatureDataUrl: null,
  managerDesignation: "Authorised Signatory",
};

function createSeed(): WorkspaceState {
  return {
    settings: defaultSettings,
    role: "OPERATOR",
    inventory: [
      {
        id: "inv-aggregates",
        itemName: "Quarry Aggregates",
        unitType: "CFT",
        standardUnitRate: 120,
        currentStock: 40,
        minSafetyThreshold: 50,
        deletedAt: null,
      },
      {
        id: "inv-msand",
        itemName: "M-Sand",
        unitType: "Loads",
        standardUnitRate: 4500,
        currentStock: 12,
        minSafetyThreshold: 4,
        deletedAt: null,
      },
      {
        id: "inv-cement",
        itemName: "OPC 53 Cement",
        unitType: "Bags",
        standardUnitRate: 420,
        currentStock: 8,
        minSafetyThreshold: 20,
        deletedAt: null,
      },
      {
        id: "inv-sand",
        itemName: "River Sand",
        unitType: "Tons",
        standardUnitRate: 2800,
        currentStock: 6,
        minSafetyThreshold: 2,
        deletedAt: null,
      },
    ],
    assets: [
      {
        id: "asset-compactor",
        assetName: "Plate compactor",
        assetCode: "PC-12",
        status: "Assigned",
        deletedAt: null,
      },
      {
        id: "asset-mixer",
        assetName: "Concrete mixer",
        assetCode: "CM-04",
        status: "Available",
        deletedAt: null,
      },
    ],
    assignments: [
      {
        id: "assign-compactor",
        assetId: "asset-compactor",
        assigneeType: "EXTERNAL_RENTER",
        employeeName: "",
        externalName: "Kumar Rentals",
        externalPhone: "9800000000",
        externalIdDetails: "DL-042011",
        issueDate: "2026-09-28",
        expectedReturnDate: "2026-10-01",
        actualReturnDate: "",
      },
    ],
    workers: [
      { id: "worker-ravi", name: "Ravi", dailyRate: 800, hourlyRate: 100 },
      { id: "worker-suresh", name: "Suresh", dailyRate: 750, hourlyRate: 95 },
    ],
    attendance: [
      {
        id: "att-ravi-1",
        workerId: "worker-ravi",
        workDate: "2026-10-05",
        mark: "FULL",
        overtimeHours: 2,
      },
      {
        id: "att-ravi-2",
        workerId: "worker-ravi",
        workDate: "2026-10-06",
        mark: "HALF",
        overtimeHours: 0,
      },
    ],
    subcontracts: [
      {
        id: "sub-wall",
        title: "Compound wall labour",
        projectTitle: "Compound Wall & Yard Fill",
        leadPersonType: "EXTERNAL_CONTRACTOR",
        leadName: "Anil",
        leadPhone: "9811111111",
        teamMembers: ["Ravi", "Suresh"],
        totalContractAmount: 150000,
        deletedAt: null,
      },
    ],
    draws: [
      {
        id: "draw-wall-1",
        subcontractId: "sub-wall",
        drawDate: "2026-10-02",
        amountPaid: 20000,
        paymentMode: "Bank Transfer",
        notes: "First advance",
      },
    ],
    payments: [],
  };
}

type WorkspaceContextValue = WorkspaceState & {
  ready: boolean;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  setRole: (role: SessionRole) => void;
  addInventory: (row: Omit<InventoryRow, "id" | "deletedAt">) => void;
  updateInventory: (id: string, patch: Partial<InventoryRow>) => void;
  archiveInventory: (id: string) => void;
  addAsset: (row: Omit<AssetRow, "id" | "deletedAt" | "status">) => void;
  addAssignment: (row: Omit<AssignmentRow, "id" | "actualReturnDate">) => void;
  returnAsset: (assignmentId: string, date: string) => void;
  archiveAsset: (id: string) => void;
  addWorker: (row: Omit<WorkerRow, "id">) => void;
  saveAttendance: (row: Omit<AttendanceRow, "id">) => void;
  addSubcontract: (row: Omit<SubcontractRow, "id" | "deletedAt">) => void;
  addDraw: (row: Omit<DrawRow, "id">) => void;
  archiveSubcontract: (id: string) => void;
  addPayment: (row: Omit<PaymentRow, "id">) => void;
  restoreRecord: (table: "central_inventory" | "assets" | "subcontracts", id: string) => void;
  purgeRecord: (table: "central_inventory" | "assets" | "subcontracts", id: string) => boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const serverSnapshot = createSeed();
let snapshot = serverSnapshot;
let hydrated = false;
const listeners = new Set<() => void>();

function normalizeSettings(saved?: Partial<CompanySettings>): CompanySettings {
  const merged = { ...defaultSettings, ...saved };
  if (!saved?.accountName && saved?.bankName === "Mattel Infrastructures Operating Account") {
    merged.accountName = "Mattel Infrastructures Operating Account";
    merged.bankName = "State Bank of India";
  }
  if (/\bllp\b/i.test(merged.companyName)) {
    merged.companyName = "Mattel Infrastructures";
  }
  return merged;
}

function hydrateSnapshot() {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    snapshot = {
      ...createSeed(),
      ...parsed,
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    snapshot = createSeed();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  hydrateSnapshot();
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function commit(next: WorkspaceState) {
  snapshot = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
  listeners.forEach((listener) => listener());
}

function update(recipe: (current: WorkspaceState) => WorkspaceState) {
  commit(recipe(getSnapshot()));
}

function stamp() {
  return new Date().toISOString();
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<WorkspaceContextValue>(() => {
    return {
      ...state,
      ready: true,
      updateSettings(patch) {
        update((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
      },
      setRole(role) {
        update((current) => ({ ...current, role }));
      },
      addInventory(row) {
        update((current) => ({
          ...current,
          inventory: [...current.inventory, { ...row, id: crypto.randomUUID(), deletedAt: null }],
        }));
      },
      updateInventory(id, patch) {
        update((current) => ({
          ...current,
          inventory: current.inventory.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },
      archiveInventory(id) {
        update((current) => ({
          ...current,
          inventory: current.inventory.map((item) =>
            item.id === id ? { ...item, deletedAt: stamp() } : item,
          ),
        }));
      },
      addAsset(row) {
        update((current) => ({
          ...current,
          assets: [
            ...current.assets,
            { ...row, id: crypto.randomUUID(), status: "Available", deletedAt: null },
          ],
        }));
      },
      addAssignment(row) {
        update((current) => ({
          ...current,
          assignments: [...current.assignments, { ...row, id: crypto.randomUUID(), actualReturnDate: "" }],
          assets: current.assets.map((asset) =>
            asset.id === row.assetId ? { ...asset, status: "Assigned" } : asset,
          ),
        }));
      },
      returnAsset(assignmentId, date) {
        update((current) => {
          const assignment = current.assignments.find((item) => item.id === assignmentId);
          if (!assignment) {
            return current;
          }
          const assignments = current.assignments.map((item) =>
            item.id === assignmentId ? { ...item, actualReturnDate: date } : item,
          );
          const stillOpen = assignments.some(
            (item) => item.assetId === assignment.assetId && !item.actualReturnDate,
          );
          return {
            ...current,
            assignments,
            assets: current.assets.map((asset) =>
              asset.id === assignment.assetId && !stillOpen
                ? { ...asset, status: "Available" }
                : asset,
            ),
          };
        });
      },
      archiveAsset(id) {
        update((current) => ({
          ...current,
          assets: current.assets.map((asset) =>
            asset.id === id ? { ...asset, deletedAt: stamp() } : asset,
          ),
        }));
      },
      addWorker(row) {
        update((current) => ({
          ...current,
          workers: [...current.workers, { ...row, id: crypto.randomUUID() }],
        }));
      },
      saveAttendance(row) {
        update((current) => {
          const existing = current.attendance.find(
            (item) => item.workerId === row.workerId && item.workDate === row.workDate,
          );
          if (!existing) {
            return {
              ...current,
              attendance: [...current.attendance, { ...row, id: crypto.randomUUID() }],
            };
          }
          return {
            ...current,
            attendance: current.attendance.map((item) =>
              item.id === existing.id ? { ...item, mark: row.mark, overtimeHours: row.overtimeHours } : item,
            ),
          };
        });
      },
      addSubcontract(row) {
        update((current) => ({
          ...current,
          subcontracts: [
            ...current.subcontracts,
            { ...row, id: crypto.randomUUID(), deletedAt: null },
          ],
        }));
      },
      addDraw(row) {
        update((current) => ({
          ...current,
          draws: [...current.draws, { ...row, id: crypto.randomUUID() }],
        }));
      },
      archiveSubcontract(id) {
        update((current) => ({
          ...current,
          subcontracts: current.subcontracts.map((item) =>
            item.id === id ? { ...item, deletedAt: stamp() } : item,
          ),
        }));
      },
      addPayment(row) {
        update((current) => ({
          ...current,
          payments: [...current.payments, { ...row, id: crypto.randomUUID() }],
        }));
      },
      restoreRecord(table, id) {
        update((current) => {
          if (table === "central_inventory") {
            return {
              ...current,
              inventory: current.inventory.map((item) =>
                item.id === id ? { ...item, deletedAt: null } : item,
              ),
            };
          }
          if (table === "assets") {
            return {
              ...current,
              assets: current.assets.map((item) =>
                item.id === id ? { ...item, deletedAt: null } : item,
              ),
            };
          }
          return {
            ...current,
            subcontracts: current.subcontracts.map((item) =>
              item.id === id ? { ...item, deletedAt: null } : item,
            ),
          };
        });
      },
      purgeRecord(table, id) {
        if (state.role !== "SUPER_ADMIN") {
          return false;
        }
        update((current) => {
          if (current.role !== "SUPER_ADMIN") {
            return current;
          }
          if (table === "central_inventory") {
            return { ...current, inventory: current.inventory.filter((item) => item.id !== id) };
          }
          if (table === "assets") {
            return { ...current, assets: current.assets.filter((item) => item.id !== id) };
          }
          return {
            ...current,
            subcontracts: current.subcontracts.filter((item) => item.id !== id),
          };
        });
        return true;
      },
    };
  }, [state]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return value;
}

export function archivedLabelDate(value: string | null) {
  if (!value) {
    return "";
  }
  return isoDate(new Date(value));
}
