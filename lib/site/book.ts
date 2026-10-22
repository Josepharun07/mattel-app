import { calculateInvoiceTotals } from "@/lib/engines/invoice-engine";
import { roundMoney } from "@/lib/money";
import type { AccessRole } from "@/lib/settings/appearance";
import { canAssignStaffRoles } from "@/lib/staff/directory";

export function canApprove(role: AccessRole) {
  return canAssignStaffRoles(role);
}

export type DiaryEntry = {
  id: string;
  entryDate: string;
  projectName: string;
  weather: string;
  workDone: string;
  quantity: number;
  unit: string;
  photoName: string;
  photoDataUrl: string;
};

export type BoqLine = {
  id: string;
  costCode: string;
  description: string;
  unit: string;
  contractQty: number;
  rate: number;
  executedQty: number;
};

export type RaBill = {
  id: string;
  billNumber: string;
  boqId: string;
  quantity: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  issuedOn: string;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  vendorName: string;
  itemName: string;
  quantity: number;
  rate: number;
  issuedOn: string;
};

export type GoodsReceipt = {
  id: string;
  orderId: string;
  quantity: number;
  receivedOn: string;
};

export type MaterialIssue = {
  id: string;
  itemName: string;
  projectName: string;
  quantity: number;
  issuedOn: string;
};

export type EquipmentLog = {
  id: string;
  machineName: string;
  logDate: string;
  runHours: number;
  idleHours: number;
  fuelLitres: number;
  hireRate: number;
  breakdown: string;
};

export type BudgetLine = {
  id: string;
  costCode: string;
  name: string;
  budgetAmount: number;
  actualAmount: number;
};

export type Drawing = {
  id: string;
  number: string;
  title: string;
  revision: string;
  revisedOn: string;
};

export type Rfi = {
  id: string;
  number: string;
  question: string;
  answer: string;
  status: "OPEN" | "ANSWERED";
};

export type Submittal = {
  id: string;
  title: string;
  specSection: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
};

export type ToolboxTalk = {
  id: string;
  talkDate: string;
  topic: string;
  attendees: string;
};

export type IncidentReport = {
  id: string;
  incidentDate: string;
  description: string;
  people: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type LeaveRequest = {
  id: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type WageDeduction = {
  id: string;
  staffName: string;
  period: string;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  net: number;
};

export type PaymentRequest = {
  id: string;
  payee: string;
  amount: number;
  purpose: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type SiteBook = {
  diary: DiaryEntry[];
  boq: BoqLine[];
  raBills: RaBill[];
  orders: PurchaseOrder[];
  receipts: GoodsReceipt[];
  issues: MaterialIssue[];
  equipment: EquipmentLog[];
  budget: BudgetLine[];
  drawings: Drawing[];
  rfis: Rfi[];
  submittals: Submittal[];
  talks: ToolboxTalk[];
  incidents: IncidentReport[];
  leave: LeaveRequest[];
  deductions: WageDeduction[];
  payments: PaymentRequest[];
};

function nid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nextNumber(existing: string[], prefix: string, year: number) {
  const head = `${prefix}/${year}/`;
  const sequence = existing.reduce((max, value) => {
    if (!value.startsWith(head)) {
      return max;
    }
    const parsed = Number(value.slice(head.length, head.length + 4));
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return `${head}${String(sequence + 1).padStart(4, "0")}`;
}

function yearOf(date: string) {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && year > 2000 ? year : new Date().getFullYear();
}

export function boqProgress(line: BoqLine) {
  if (line.contractQty <= 0) {
    return 0;
  }
  return Math.min(100, roundMoney((line.executedQty / line.contractQty) * 100));
}

export function billedQty(book: SiteBook, boqId: string) {
  return roundMoney(book.raBills.filter((bill) => bill.boqId === boqId).reduce((sum, bill) => sum + bill.quantity, 0));
}

export function receivedQty(book: SiteBook, orderId: string) {
  return roundMoney(book.receipts.filter((row) => row.orderId === orderId).reduce((sum, row) => sum + row.quantity, 0));
}

export function stockOnHand(book: SiteBook, itemName: string) {
  const received = book.orders
    .filter((order) => order.itemName.toLowerCase() === itemName.toLowerCase())
    .reduce((sum, order) => sum + receivedQty(book, order.id), 0);
  const issued = book.issues
    .filter((row) => row.itemName.toLowerCase() === itemName.toLowerCase())
    .reduce((sum, row) => sum + row.quantity, 0);
  return roundMoney(received - issued);
}

export function hireCost(log: EquipmentLog) {
  return roundMoney(log.runHours * log.hireRate);
}

export function budgetVariance(line: BudgetLine) {
  return roundMoney(line.budgetAmount - line.actualAmount);
}

export function wageDeductions(gross: number, tdsPercent: number) {
  if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(tdsPercent) || tdsPercent < 0) {
    return { ok: false as const, message: "Gross pay and the TDS percent must be zero or more." };
  }
  const pf = roundMoney(gross * 0.12);
  const esi = gross > 0 && gross <= 21000 ? roundMoney(gross * 0.0075) : 0;
  const tds = roundMoney(gross * (tdsPercent / 100));
  return { ok: true as const, pf, esi, tds, net: roundMoney(gross - pf - esi - tds) };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function tallyVoucherXml(book: SiteBook) {
  const vouchers = book.payments
    .filter((payment) => payment.status === "APPROVED")
    .map((payment, index) => {
      const amount = payment.amount.toFixed(2);
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Payment" ACTION="Create"><DATE>${new Date().toISOString().slice(0, 10).replaceAll("-", "")}</DATE><VOUCHERNUMBER>PAY-${index + 1}</VOUCHERNUMBER><NARRATION>${escapeXml(payment.purpose)}</NARRATION><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(payment.payee)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${amount}</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>Mattel Infrastructures Operating Account</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${amount}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`;
    })
    .join("");
  return `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${vouchers}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

export function seedSiteBook(): SiteBook {
  const order: PurchaseOrder = {
    id: "po-cement",
    number: "MI/PO/2026/0001",
    vendorName: "ABC Supplies",
    itemName: "Cement",
    quantity: 50,
    rate: 420,
    issuedOn: "2026-10-20",
  };
  return {
    diary: [
      {
        id: "diary-wall",
        entryDate: "2026-10-22",
        projectName: "Compound Wall & Yard Fill",
        weather: "Clear",
        workDone: "Blockwork on the east wall",
        quantity: 12,
        unit: "sqm",
        photoName: "",
        photoDataUrl: "",
      },
    ],
    boq: [
      {
        id: "boq-masonry",
        costCode: "CIV-MASN",
        description: "Block masonry",
        unit: "sqm",
        contractQty: 100,
        rate: 450,
        executedQty: 40,
      },
    ],
    raBills: [],
    orders: [order],
    receipts: [{ id: "grn-cement", orderId: order.id, quantity: 20, receivedOn: "2026-10-21" }],
    issues: [],
    equipment: [],
    budget: [{ id: "budget-masonry", costCode: "CIV-MASN", name: "Block masonry", budgetAmount: 45000, actualAmount: 18000 }],
    drawings: [{ id: "drawing-a101", number: "A-101", title: "Compound wall plan", revision: "A", revisedOn: "2026-10-01" }],
    rfis: [{ id: "rfi-1", number: "MI/RFI/2026/0001", question: "Confirm the wall height at the gate.", answer: "", status: "OPEN" }],
    submittals: [{ id: "submittal-1", title: "Block sample", specSection: "04 20 00", status: "DRAFT" }],
    talks: [],
    incidents: [],
    leave: [
      {
        id: "leave-rajesh",
        staffName: "Rajesh Kumar",
        startDate: "2026-10-28",
        endDate: "2026-10-28",
        reason: "Personal",
        status: "PENDING",
      },
    ],
    deductions: [],
    payments: [
      {
        id: "pay-cement",
        payee: "ABC Supplies",
        amount: 8400,
        purpose: "Cement received against MI/PO/2026/0001",
        status: "PENDING",
      },
    ],
  };
}

export function addDiary(book: SiteBook, entry: Omit<DiaryEntry, "id">) {
  if (!entry.projectName.trim() || !entry.workDone.trim()) {
    return { ok: false as const, message: "Enter the project and the work done." };
  }
  if (!Number.isFinite(entry.quantity) || entry.quantity < 0) {
    return { ok: false as const, message: "Quantity must be zero or more." };
  }
  const row: DiaryEntry = { ...entry, id: nid("diary"), projectName: entry.projectName.trim(), workDone: entry.workDone.trim() };
  return { ok: true as const, book: { ...book, diary: [row, ...book.diary] }, row };
}

export function addBoqLine(book: SiteBook, line: Omit<BoqLine, "id" | "executedQty">) {
  if (!line.costCode.trim() || !line.description.trim() || line.contractQty <= 0 || line.rate < 0) {
    return { ok: false as const, message: "Enter a cost code, description, contract quantity, and rate." };
  }
  const row: BoqLine = { ...line, id: nid("boq"), executedQty: 0, costCode: line.costCode.trim().toUpperCase() };
  return { ok: true as const, book: { ...book, boq: [...book.boq, row] }, row };
}

export function recordExecution(book: SiteBook, boqId: string, quantity: number) {
  const line = book.boq.find((item) => item.id === boqId);
  if (!line || quantity <= 0) {
    return { ok: false as const, message: "Enter a quantity for a bill item." };
  }
  if (line.executedQty + quantity > line.contractQty) {
    return { ok: false as const, message: "Executed quantity cannot pass the contract quantity." };
  }
  return {
    ok: true as const,
    book: {
      ...book,
      boq: book.boq.map((item) => (item.id === line.id ? { ...item, executedQty: roundMoney(item.executedQty + quantity) } : item)),
    },
  };
}

export function raiseRaBill(book: SiteBook, boqId: string, issuedOn: string, gstEnabled: boolean) {
  const line = book.boq.find((item) => item.id === boqId);
  if (!line) {
    return { ok: false as const, message: "Choose a bill item." };
  }
  const quantity = roundMoney(line.executedQty - billedQty(book, line.id));
  if (quantity <= 0) {
    return { ok: false as const, message: "There is no new executed quantity to bill." };
  }
  const totals = calculateInvoiceTotals([{ quantity, rate: line.rate }], { gstEnabled, isInterstate: false });
  const bill: RaBill = {
    id: nid("ra"),
    billNumber: nextNumber(book.raBills.map((item) => item.billNumber), "MI/RA", yearOf(issuedOn)),
    boqId: line.id,
    quantity,
    ...totals,
    issuedOn,
  };
  return { ok: true as const, book: { ...book, raBills: [bill, ...book.raBills] }, bill };
}

export function addPurchaseOrder(book: SiteBook, order: Omit<PurchaseOrder, "id" | "number">) {
  if (!order.vendorName.trim() || !order.itemName.trim() || order.quantity <= 0 || order.rate < 0) {
    return { ok: false as const, message: "Enter the vendor, material, quantity, and rate." };
  }
  const row: PurchaseOrder = {
    ...order,
    id: nid("po"),
    vendorName: order.vendorName.trim(),
    itemName: order.itemName.trim(),
    number: nextNumber(book.orders.map((item) => item.number), "MI/PO", yearOf(order.issuedOn)),
  };
  return { ok: true as const, book: { ...book, orders: [row, ...book.orders] }, row };
}

export function receiveGoods(book: SiteBook, orderId: string, quantity: number, receivedOn: string) {
  const order = book.orders.find((item) => item.id === orderId);
  if (!order || quantity <= 0) {
    return { ok: false as const, message: "Enter a received quantity." };
  }
  if (receivedQty(book, order.id) + quantity > order.quantity) {
    return { ok: false as const, message: "Received quantity cannot pass the order." };
  }
  const row: GoodsReceipt = { id: nid("grn"), orderId: order.id, quantity, receivedOn };
  return { ok: true as const, book: { ...book, receipts: [row, ...book.receipts] }, row };
}

export function issueMaterial(book: SiteBook, issue: Omit<MaterialIssue, "id">) {
  if (!issue.itemName.trim() || !issue.projectName.trim() || issue.quantity <= 0) {
    return { ok: false as const, message: "Enter the material, site, and quantity." };
  }
  if (issue.quantity > stockOnHand(book, issue.itemName)) {
    return { ok: false as const, message: "That quantity is not in stock." };
  }
  const row: MaterialIssue = { ...issue, id: nid("issue"), itemName: issue.itemName.trim(), projectName: issue.projectName.trim() };
  return { ok: true as const, book: { ...book, issues: [row, ...book.issues] }, row };
}

export function addEquipmentLog(book: SiteBook, log: Omit<EquipmentLog, "id">) {
  if (!log.machineName.trim() || log.runHours < 0 || log.idleHours < 0 || log.fuelLitres < 0 || log.hireRate < 0) {
    return { ok: false as const, message: "Enter the machine and zero or more hours, fuel, and hire rate." };
  }
  const row: EquipmentLog = { ...log, id: nid("plant"), machineName: log.machineName.trim() };
  return { ok: true as const, book: { ...book, equipment: [row, ...book.equipment] }, row };
}

export function addBudgetLine(book: SiteBook, line: Omit<BudgetLine, "id">) {
  if (!line.costCode.trim() || !line.name.trim() || line.budgetAmount < 0 || line.actualAmount < 0) {
    return { ok: false as const, message: "Enter a cost code, name, budget, and actual." };
  }
  const row: BudgetLine = { ...line, id: nid("budget"), costCode: line.costCode.trim().toUpperCase(), name: line.name.trim() };
  return { ok: true as const, book: { ...book, budget: [...book.budget, row] }, row };
}

export function addDrawing(book: SiteBook, drawing: Omit<Drawing, "id" | "revision">) {
  if (!drawing.number.trim() || !drawing.title.trim()) {
    return { ok: false as const, message: "Enter the drawing number and title." };
  }
  const row: Drawing = { ...drawing, id: nid("drawing"), number: drawing.number.trim(), title: drawing.title.trim(), revision: "A" };
  return { ok: true as const, book: { ...book, drawings: [row, ...book.drawings] }, row };
}

export function reviseDrawing(book: SiteBook, drawingId: string, revisedOn: string) {
  const drawing = book.drawings.find((item) => item.id === drawingId);
  if (!drawing) {
    return { ok: false as const, message: "Choose a drawing." };
  }
  const revision = String.fromCharCode(drawing.revision.charCodeAt(0) + 1);
  return {
    ok: true as const,
    book: { ...book, drawings: book.drawings.map((item) => (item.id === drawing.id ? { ...item, revision, revisedOn } : item)) },
  };
}

export function addRfi(book: SiteBook, question: string, askedOn: string) {
  if (!question.trim()) {
    return { ok: false as const, message: "Enter the question." };
  }
  const row: Rfi = {
    id: nid("rfi"),
    number: nextNumber(book.rfis.map((item) => item.number), "MI/RFI", yearOf(askedOn)),
    question: question.trim(),
    answer: "",
    status: "OPEN",
  };
  return { ok: true as const, book: { ...book, rfis: [row, ...book.rfis] }, row };
}

export function answerRfi(book: SiteBook, rfiId: string, answer: string) {
  if (!answer.trim()) {
    return { ok: false as const, message: "Enter the answer." };
  }
  const row = book.rfis.find((item) => item.id === rfiId);
  if (!row) {
    return { ok: false as const, message: "Choose a request." };
  }
  return {
    ok: true as const,
    book: { ...book, rfis: book.rfis.map((item) => (item.id === row.id ? { ...item, answer: answer.trim(), status: "ANSWERED" } : item)) },
  };
}

export function addSubmittal(book: SiteBook, title: string, specSection: string) {
  if (!title.trim()) {
    return { ok: false as const, message: "Enter the submittal title." };
  }
  const row: Submittal = { id: nid("submittal"), title: title.trim(), specSection: specSection.trim(), status: "DRAFT" };
  return { ok: true as const, book: { ...book, submittals: [row, ...book.submittals] }, row };
}

export function setSubmittalStatus(book: SiteBook, submittalId: string, status: Submittal["status"]) {
  const row = book.submittals.find((item) => item.id === submittalId);
  if (!row) {
    return { ok: false as const, message: "Choose a submittal." };
  }
  return { ok: true as const, book: { ...book, submittals: book.submittals.map((item) => (item.id === row.id ? { ...item, status } : item)) } };
}

export function addToolboxTalk(book: SiteBook, talk: Omit<ToolboxTalk, "id">) {
  if (!talk.topic.trim()) {
    return { ok: false as const, message: "Enter the topic." };
  }
  const row: ToolboxTalk = { ...talk, id: nid("talk"), topic: talk.topic.trim() };
  return { ok: true as const, book: { ...book, talks: [row, ...book.talks] }, row };
}

export function addIncident(book: SiteBook, incident: Omit<IncidentReport, "id">) {
  if (!incident.description.trim()) {
    return { ok: false as const, message: "Describe the incident." };
  }
  const row: IncidentReport = { ...incident, id: nid("incident"), description: incident.description.trim() };
  return { ok: true as const, book: { ...book, incidents: [row, ...book.incidents] }, row };
}

export function requestLeave(book: SiteBook, leave: Omit<LeaveRequest, "id" | "status">) {
  if (!leave.staffName.trim() || !leave.startDate || !leave.endDate) {
    return { ok: false as const, message: "Enter the person and the dates." };
  }
  const row: LeaveRequest = { ...leave, id: nid("leave"), staffName: leave.staffName.trim(), status: "PENDING" };
  return { ok: true as const, book: { ...book, leave: [row, ...book.leave] }, row };
}

export function decideLeave(book: SiteBook, leaveId: string, status: "APPROVED" | "REJECTED", actor: AccessRole) {
  if (!canApprove(actor)) {
    return { ok: false as const, message: "Only an owner or a super admin can decide leave." };
  }
  const row = book.leave.find((item) => item.id === leaveId);
  if (!row) {
    return { ok: false as const, message: "Choose a leave request." };
  }
  return { ok: true as const, book: { ...book, leave: book.leave.map((item) => (item.id === row.id ? { ...item, status } : item)) } };
}

export function saveWageDeduction(book: SiteBook, staffName: string, period: string, gross: number, tdsPercent: number) {
  if (!staffName.trim() || !period.trim()) {
    return { ok: false as const, message: "Enter the person and the period." };
  }
  const amounts = wageDeductions(gross, tdsPercent);
  if (!amounts.ok) {
    return amounts;
  }
  const row: WageDeduction = { id: nid("wage"), staffName: staffName.trim(), period: period.trim(), gross, ...amounts };
  return { ok: true as const, book: { ...book, deductions: [row, ...book.deductions] }, row };
}

export function requestPayment(book: SiteBook, payment: Omit<PaymentRequest, "id" | "status">) {
  if (!payment.payee.trim() || !payment.purpose.trim() || payment.amount <= 0) {
    return { ok: false as const, message: "Enter the payee, purpose, and amount." };
  }
  const row: PaymentRequest = { ...payment, id: nid("payment"), payee: payment.payee.trim(), purpose: payment.purpose.trim(), status: "PENDING" };
  return { ok: true as const, book: { ...book, payments: [row, ...book.payments] }, row };
}

export function decidePayment(book: SiteBook, paymentId: string, status: "APPROVED" | "REJECTED", actor: AccessRole) {
  if (!canApprove(actor)) {
    return { ok: false as const, message: "Only an owner or a super admin can approve a payment." };
  }
  const row = book.payments.find((item) => item.id === paymentId);
  if (!row) {
    return { ok: false as const, message: "Choose a payment." };
  }
  return { ok: true as const, book: { ...book, payments: book.payments.map((item) => (item.id === row.id ? { ...item, status } : item)) } };
}
