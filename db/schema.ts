import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const unitTypesDefault = sql`ARRAY['Loads', 'Bags', 'CFT', 'Tons', 'Hours', 'Days', 'Trips']::text[]`;

export const borrowerTypeEnum = pgEnum("asset_borrower_type", [
  "REGISTERED_CLIENT",
  "UNREGISTERED",
]);

export const assetCurrentStatus = pgEnum("asset_current_status", [
  "AVAILABLE",
  "RENTED_INTERNAL",
  "RENTED_EXTERNAL",
  "MAINTENANCE",
]);

export const assignmentBorrowerType = pgEnum("assignment_borrower_type", [
  "INTERNAL_WORKER",
  "EXTERNAL_RENTER",
]);
const money = { precision: 14, scale: 2 } as const;

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull().default("Mattel Infrastructures"),
  tagline: text("tagline").default("Building Tomorrow's Foundation"),
  address: text("address").notNull().default("Kerala, India"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  gstin: text("gstin"),
  bankName: text("bank_name").notNull().default("State Bank of India"),
  accountName: text("account_name").notNull().default("Mattel Infrastructures Operating Account"),
  accountNumber: text("account_number").notNull().default(""),
  ifscCode: text("ifsc_code").notNull().default(""),
  upiId: text("upi_id"),
  defaultTerms: text("default_terms"),
  unitTypes: text("unit_types").array().notNull().default(unitTypesDefault),
  logoUrl: text("logo_url"),
  signatureUrl: text("signature_url"),
  defaultStationeryMode: boolean("default_stationery_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone").notNull().default(""),
  address: text("address"),
  gstin: text("gstin"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull().default(""),
  title: text("title").notNull(),
  location: text("location"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const centralInventory = pgTable("central_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: text("item_name").notNull(),
  unitType: text("unit_type").notNull(),
  standardUnitRate: numeric("standard_unit_rate", money).notNull().default("0.00"),
  currentStock: numeric("current_stock", money).notNull().default("0.00"),
  minSafetyThreshold: numeric("min_safety_threshold", money).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unitType: text("unit_type").notNull(),
  centralRate: numeric("central_rate", money).notNull(),
  currentStock: numeric("current_stock", money).notNull().default("0.00"),
  lowStockThreshold: numeric("low_stock_threshold", money).notNull().default("10.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const stockChangeType = pgEnum("stock_change_type", [
  "INBOUND_PURCHASE",
  "OUTBOUND_INVOICE",
  "MANUAL_CORRECTION",
  "RETURN",
]);

export const inventoryStockLogs = pgTable("inventory_stock_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .references(() => inventoryItems.id, { onDelete: "cascade" })
    .notNull(),
  changeType: stockChangeType("change_type").notNull(),
  quantity: numeric("quantity", money).notNull(),
  previousStock: numeric("previous_stock", money).notNull(),
  newStock: numeric("new_stock", money).notNull(),
  referenceId: text("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseInvoiceNumber: text("base_invoice_number").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  version: integer("version").notNull().default(0),
  isFinalized: boolean("is_finalized").notNull().default(true),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  resortLeaseId: uuid("resort_lease_id").references(() => resortLeases.id, { onDelete: "set null" }),
  billingPeriod: text("billing_period"),
  invoiceType: text("invoice_type").notNull().default("CONSTRUCTION"),
  issueDate: date("issue_date").notNull().defaultNow(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", money).notNull(),
  cgstAmount: numeric("cgst_amount", money).notNull().default("0.00"),
  sgstAmount: numeric("sgst_amount", money).notNull().default("0.00"),
  igstAmount: numeric("igst_amount", money).notNull().default("0.00"),
  totalAmount: numeric("total_amount", money).notNull().default("0.00"),
  cgst: numeric("cgst", money).notNull().default("0.00"),
  sgst: numeric("sgst", money).notNull().default("0.00"),
  igst: numeric("igst", money).notNull().default("0.00"),
  grandTotal: numeric("grand_total", money).notNull(),
  amountPaid: numeric("amount_paid", money).notNull().default("0.00"),
  paymentStatus: text("payment_status").notNull().default("Unpaid"),
  transitPassNo: text("transit_pass_no"),
  ewayBillNo: text("eway_bill_no"),
  letterheadMode: boolean("letterhead_mode").notNull().default(true),
  stationeryMode: boolean("stationery_mode").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const ledgerEntityType = pgEnum("ledger_entity_type", ["PROJECT", "CLIENT", "PERSON"]);

export const ledgerStockSource = pgEnum("ledger_stock_source", ["CENTRAL_INVENTORY", "DIRECT_PURCHASE"]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  entityType: ledgerEntityType("entity_type").notNull().default("PROJECT"),
  eventType: text("event_type").notNull().default("MATERIAL_DRAW"),
  description: text("description").notNull().default(""),
  entryDate: timestamp("entry_date", { withTimezone: true }).notNull().defaultNow(),
  materialName: text("material_name").notNull(),
  quantity: numeric("quantity", money).notNull(),
  unitType: text("unit_type").notNull(),
  centralRate: numeric("central_rate", money).notNull(),
  overrideRate: numeric("override_rate", money).notNull(),
  totalPrice: numeric("total_price", money).notNull(),
  finalPrice: numeric("final_price", money).notNull().default("0.00"),
  transitPassNumber: text("transit_pass_number"),
  ewayBillNumber: text("eway_bill_number"),
  vehicleNumber: text("vehicle_number"),
  source: text("source").notNull().default("DIRECT"),
  stockSource: ledgerStockSource("stock_source").notNull().default("DIRECT_PURCHASE"),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const deliveryLedger = pgTable("delivery_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  inventoryItemId: uuid("inventory_item_id")
    .references(() => inventoryItems.id, { onDelete: "restrict" })
    .notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  materialName: text("material_name").notNull(),
  quantity: numeric("quantity", money).notNull(),
  unitType: text("unit_type").notNull(),
  centralRate: numeric("central_rate", money).notNull(),
  overrideRate: numeric("override_rate", money).notNull(),
  totalPrice: numeric("total_price", money).notNull(),
  transitPassNo: text("transit_pass_no"),
  ewayBillNo: text("eway_bill_no"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryItemId: uuid("inventory_item_id")
    .references(() => inventoryItems.id, { onDelete: "cascade" })
    .notNull(),
  deliveryId: uuid("delivery_id").references(() => deliveryLedger.id, { onDelete: "set null" }),
  direction: text("direction").notNull(),
  quantity: numeric("quantity", money).notNull(),
  balanceAfter: numeric("balance_after", money).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const invoicePayments = pgTable("invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .references(() => invoices.id, { onDelete: "cascade" })
    .notNull(),
  paymentDate: date("payment_date").notNull().defaultNow(),
  amountPaid: numeric("amount_paid", money).notNull(),
  paymentMode: text("payment_mode").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetName: text("asset_name").notNull(),
  assetCode: text("asset_code").unique(),
  serialNumber: text("serial_number").unique(),
  category: text("category").notNull().default("POWER_TOOLS"),
  status: text("status").notNull().default("Available"),
  currentStatus: assetCurrentStatus("current_status").notNull().default("AVAILABLE"),
  defaultDailyRate: numeric("default_daily_rate", money).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const assetAssignments = pgTable("asset_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id")
    .references(() => assets.id, { onDelete: "cascade" })
    .notNull(),
  assigneeType: text("assignee_type").notNull(),
  employeeId: uuid("employee_id"),
  externalName: text("external_name"),
  externalPhone: text("external_phone"),
  externalIdDetails: text("external_id_details"),
  issueDate: date("issue_date").notNull().defaultNow(),
  expectedReturnDate: date("expected_return_date").notNull(),
  actualReturnDate: date("actual_return_date"),
  conditionNotes: text("condition_notes"),
  borrowerType: assignmentBorrowerType("borrower_type").notNull().default("EXTERNAL_RENTER"),
  staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  externalBorrowerName: text("external_borrower_name"),
  externalBorrowerPhone: text("external_borrower_phone"),
  conditionOnIssue: text("condition_on_issue").notNull().default("GOOD"),
  conditionOnReturn: text("condition_on_return"),
  dailyRateApplied: numeric("daily_rate_applied", money).notNull().default("0.00"),
  totalRentCharged: numeric("total_rent_charged", money).notNull().default("0.00"),
  comments: text("comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const assetRentals = pgTable("asset_rentals", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetName: text("asset_name").notNull(),
  borrowerType: borrowerTypeEnum("borrower_type").notNull(),
  borrowerName: text("borrower_name").notNull(),
  borrowerContact: text("borrower_contact"),
  dailyRate: numeric("daily_rate", money).notNull(),
  rentedAt: timestamp("rented_at", { withTimezone: true }).notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  hourlyRate: numeric("hourly_rate", money).notNull(),
  dailyBaseRate: numeric("daily_base_rate", money).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const payrollCheckoutType = pgEnum("payroll_checkout_type", [
  "WEEKLY_CYCLED",
  "MID_WEEK_CHECKOUT",
]);

export const payrollSettlementStatus = pgEnum("payroll_settlement_status", [
  "PENDING",
  "PAID",
]);

export const advancePaymentMode = pgEnum("advance_payment_mode", ["CASH", "UPI", "BANK_TRANSFER"]);

export const payrollSettlements = pgTable("payroll_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  settlementDate: timestamp("settlement_date", { withTimezone: true }).defaultNow().notNull(),
  basePayslipNumber: text("base_payslip_number").notNull(),
  payslipNumber: text("payslip_number").notNull().unique(),
  version: integer("version").notNull().default(0),
  daysPresent: numeric("days_present", money).notNull(),
  totalOvertimeHours: numeric("total_overtime_hours", money).notNull(),
  basePay: numeric("base_pay", money).notNull(),
  overtimePay: numeric("overtime_pay", money).notNull(),
  grossPayable: numeric("gross_payable", money).notNull(),
  grossEarned: numeric("gross_earned", money).notNull().default("0.00"),
  priorBalanceCarryover: numeric("prior_balance_carryover", money).notNull().default("0.00"),
  priorAdvanceCarryover: numeric("prior_advance_carryover", money).notNull().default("0.00"),
  currentCycleAdvances: numeric("current_cycle_advances", money).notNull().default("0.00"),
  totalDeductions: numeric("total_deductions", money).notNull().default("0.00"),
  netAmountDue: numeric("net_amount_due", money).notNull().default("0.00"),
  amountPaid: numeric("amount_paid", money).notNull().default("0.00"),
  closingBalance: numeric("closing_balance", money).notNull().default("0.00"),
  newBalanceCarryover: numeric("new_balance_carryover", money).notNull().default("0.00"),
  newAdvanceCarryover: numeric("new_advance_carryover", money).notNull().default("0.00"),
  checkoutType: payrollCheckoutType("checkout_type").notNull(),
  status: payrollSettlementStatus("status").notNull().default("PAID"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const staffAdvances = pgTable("staff_advances", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  requestDate: timestamp("request_date", { withTimezone: true }).defaultNow().notNull(),
  amount: numeric("amount", money).notNull(),
  paymentMode: advancePaymentMode("payment_mode").notNull(),
  notes: text("notes"),
  settlementId: uuid("settlement_id").references(() => payrollSettlements.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceLogs = pgTable("attendance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  workDate: timestamp("work_date", { withTimezone: true }).notNull(),
  isPresent: boolean("is_present").notNull().default(true),
  overtimeHours: numeric("overtime_hours", money).notNull().default("0.00"),
  settlementId: uuid("settlement_id").references(() => payrollSettlements.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const payrollSlips = pgTable("payroll_slips", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  periodLabel: text("period_label").notNull(),
  daysPresent: integer("days_present").notNull(),
  totalOvertimeHours: numeric("total_overtime_hours", money).notNull(),
  basePay: numeric("base_pay", money).notNull(),
  overtimePay: numeric("overtime_pay", money).notNull(),
  totalPay: numeric("total_pay", money).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const subcontractStatus = pgEnum("subcontract_status", ["ACTIVE", "COMPLETED", "TERMINATED"]);

export const subcontracts = pgTable("subcontracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  leadPersonType: text("lead_person_type").notNull(),
  leadEmployeeId: uuid("lead_employee_id"),
  leadStaffId: uuid("lead_staff_id").references(() => staff.id, { onDelete: "set null" }),
  externalLeadName: text("external_lead_name"),
  externalLeadPhone: text("external_lead_phone"),
  teamMembers: jsonb("team_members").$type<{ staffId?: string | null; name: string }[]>().default([]),
  totalContractAmount: numeric("total_contract_amount", money).notNull().default("0.00"),
  status: subcontractStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const subcontractDraws = pgTable("subcontract_draws", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractId: uuid("subcontract_id")
    .references(() => subcontracts.id, { onDelete: "cascade" })
    .notNull(),
  drawDate: date("draw_date").notNull().defaultNow(),
  amountPaid: numeric("amount_paid", money).notNull(),
  paymentMode: text("payment_mode").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const resortLeaseStatus = pgEnum("resort_lease_status", ["ACTIVE", "EXPIRED", "TERMINATED"]);

export const resortLeases = pgTable("resort_leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyName: text("property_name").notNull(),
  operatorName: text("operator_name").notNull(),
  operatorContact: text("operator_contact").notNull(),
  operatorEmail: text("operator_email"),
  operatorGstin: text("operator_gstin"),
  monthlyRentAmount: numeric("monthly_rent_amount", money).notNull(),
  billingDueDay: integer("billing_due_day").notNull().default(1),
  leaseStartDate: date("lease_start_date").notNull(),
  leaseEndDate: date("lease_end_date").notNull(),
  status: resortLeaseStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow().notNull(),
});
