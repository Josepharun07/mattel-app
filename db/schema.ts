import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
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
  active: boolean("active").notNull().default(true),
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
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projectClients = pgTable(
  "project_clients",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.clientId] })],
);

export const projectEntries = pgTable("project_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  enteredAt: timestamp("entered_at", { withTimezone: true }).defaultNow().notNull(),
  item: text("item").notNull(),
  description: text("description").notNull().default(""),
  quantity: numeric("quantity", money).notNull().default("0.00"),
  unitPrice: numeric("unit_price", money).notNull().default("0.00"),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  panNumber: text("pan_number").notNull().default(""),
  aadhaarNumber: text("aadhaar_number").notNull().default(""),
  upiId: text("upi_id").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  ifscCode: text("ifsc_code").notNull().default(""),
  emergencyName: text("emergency_name").notNull().default(""),
  emergencyPhone: text("emergency_phone").notNull().default(""),
  emergencyRelation: text("emergency_relation").notNull().default(""),
  joiningDate: date("joining_date"),
  bloodGroup: text("blood_group").notNull().default(""),
  notes: text("notes").notNull().default(""),
  accountRole: text("account_role").notNull().default("STAFF"),
  pageAccess: text("page_access").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
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

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  kind: text("kind").notNull(),
  displayName: text("display_name").notNull(),
  accessRole: text("access_role"),
  staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSessions = pgTable("app_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .references(() => appUsers.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => appUsers.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profileChangeRequests = pgTable("profile_change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("PENDING"),
  submittedBy: uuid("submitted_by").references(() => appUsers.id, { onDelete: "set null" }),
  reviewedBy: uuid("reviewed_by").references(() => appUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const jobRoles = pgTable("job_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  builtIn: boolean("built_in").notNull().default(false),
});

export const staffPhones = pgTable("staff_phones", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .references(() => staff.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull().default(""),
  phoneNumber: text("phone_number").notNull(),
});

export const staffRoleAssignments = pgTable(
  "staff_role_assignments",
  {
    staffId: uuid("staff_id")
      .references(() => staff.id, { onDelete: "cascade" })
      .notNull(),
    roleId: uuid("role_id")
      .references(() => jobRoles.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.staffId, table.roleId] })],
);

export const siteDiary = pgTable("site_diary", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryDate: date("entry_date").notNull(),
  projectName: text("project_name").notNull(),
  weather: text("weather").notNull().default(""),
  workDone: text("work_done").notNull(),
  quantity: numeric("quantity", money).notNull().default("0"),
  unit: text("unit").notNull().default(""),
  labourCount: integer("labour_count").notNull().default(0),
  skilledCount: integer("skilled_count").notNull().default(0),
  hindrance: text("hindrance").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  photoName: text("photo_name").notNull().default(""),
  photoDataUrl: text("photo_data_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const boqItems = pgTable("boq_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  section: text("section").notNull().default("Civil"),
  costCode: text("cost_code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  contractQty: numeric("contract_qty", money).notNull(),
  rate: numeric("rate", money).notNull(),
  executedQty: numeric("executed_qty", money).notNull().default("0"),
});

export const raBills = pgTable("ra_bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  billNumber: text("bill_number").notNull().unique(),
  boqId: uuid("boq_id")
    .references(() => boqItems.id, { onDelete: "cascade" })
    .notNull(),
  quantity: numeric("quantity", money).notNull(),
  subtotal: numeric("subtotal", money).notNull(),
  cgst: numeric("cgst", money).notNull(),
  sgst: numeric("sgst", money).notNull(),
  igst: numeric("igst", money).notNull(),
  total: numeric("total", money).notNull(),
  retentionPercent: numeric("retention_percent", money).notNull().default("5"),
  retentionAmount: numeric("retention_amount", money).notNull().default("0"),
  netPayable: numeric("net_payable", money).notNull().default("0"),
  issuedOn: date("issued_on").notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  vendorName: text("vendor_name").notNull(),
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull().default(""),
  quantity: numeric("quantity", money).notNull(),
  rate: numeric("rate", money).notNull(),
  issuedOn: date("issued_on").notNull(),
  expectedOn: date("expected_on"),
});

export const goodsReceipts = pgTable("goods_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => purchaseOrders.id, { onDelete: "cascade" })
    .notNull(),
  quantity: numeric("quantity", money).notNull(),
  rejectedQuantity: numeric("rejected_quantity", money).notNull().default("0"),
  receivedOn: date("received_on").notNull(),
});

export const materialIssues = pgTable("material_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: text("item_name").notNull(),
  projectName: text("project_name").notNull(),
  costCode: text("cost_code").notNull().default(""),
  quantity: numeric("quantity", money).notNull(),
  issuedOn: date("issued_on").notNull(),
});

export const equipmentLogs = pgTable("equipment_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineName: text("machine_name").notNull(),
  ownership: text("ownership").notNull().default("HIRED"),
  operatorName: text("operator_name").notNull().default(""),
  siteName: text("site_name").notNull().default(""),
  logDate: date("log_date").notNull(),
  openingReading: numeric("opening_reading", money).notNull().default("0"),
  closingReading: numeric("closing_reading", money).notNull().default("0"),
  runHours: numeric("run_hours", money).notNull(),
  idleHours: numeric("idle_hours", money).notNull(),
  fuelLitres: numeric("fuel_litres", money).notNull(),
  hireRate: numeric("hire_rate", money).notNull(),
  breakdown: text("breakdown").notNull().default(""),
});

export const budgetLines = pgTable("budget_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  costCode: text("cost_code").notNull(),
  name: text("name").notNull(),
  budgetAmount: numeric("budget_amount", money).notNull(),
  committedAmount: numeric("committed_amount", money).notNull().default("0"),
  actualAmount: numeric("actual_amount", money).notNull(),
});

export const drawings = pgTable("drawings", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  discipline: text("discipline").notNull().default(""),
  revision: text("revision").notNull(),
  revisedOn: date("revised_on").notNull(),
  status: text("status").notNull().default("CURRENT"),
  remarks: text("remarks").notNull().default(""),
});

export const rfis = pgTable("rfis", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  discipline: text("discipline").notNull().default(""),
  askedBy: text("asked_by").notNull().default(""),
  dueDate: date("due_date"),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  status: text("status").notNull(),
});

export const submittals = pgTable("submittals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  specSection: text("spec_section").notNull().default(""),
  submittalType: text("submittal_type").notNull().default("SAMPLE"),
  reviewer: text("reviewer").notNull().default(""),
  status: text("status").notNull(),
});

export const toolboxTalks = pgTable("toolbox_talks", {
  id: uuid("id").primaryKey().defaultRandom(),
  talkDate: date("talk_date").notNull(),
  topic: text("topic").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  attendees: text("attendees").notNull().default(""),
  hazards: text("hazards").notNull().default(""),
});

export const incidentReports = pgTable("incident_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentDate: date("incident_date").notNull(),
  category: text("category").notNull().default("NEAR_MISS"),
  description: text("description").notNull(),
  people: text("people").notNull().default(""),
  severity: text("severity").notNull(),
  lostHours: numeric("lost_hours", money).notNull().default("0"),
  immediateAction: text("immediate_action").notNull().default(""),
  status: text("status").notNull().default("OPEN"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffName: text("staff_name").notNull(),
  leaveType: text("leave_type").notNull().default("CASUAL"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: numeric("days", money).notNull().default("1"),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull(),
});

export const wageDeductions = pgTable("wage_deductions", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffName: text("staff_name").notNull(),
  period: text("period").notNull(),
  gross: numeric("gross", money).notNull(),
  pf: numeric("pf", money).notNull(),
  esi: numeric("esi", money).notNull(),
  employerPf: numeric("employer_pf", money).notNull().default("0"),
  employerEsi: numeric("employer_esi", money).notNull().default("0"),
  tds: numeric("tds", money).notNull(),
  net: numeric("net", money).notNull(),
  costToCompany: numeric("cost_to_company", money).notNull().default("0"),
});

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  payee: text("payee").notNull(),
  amount: numeric("amount", money).notNull(),
  purpose: text("purpose").notNull(),
  costCode: text("cost_code").notNull().default(""),
  requestedBy: text("requested_by").notNull().default(""),
  status: text("status").notNull(),
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
