import { existsSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../lib/auth/passwords";
import { ensureSuperAdmin } from "../lib/auth/ensure-admin";
import { calculateInvoiceTotals } from "../lib/engines/invoice-engine";
import { calculateStaffPayroll } from "../lib/engines/payroll-engine";
import { seedRoles } from "../lib/staff/directory";
import { defaultSystemSettings } from "../lib/settings/profile";
import * as schema from "./schema";

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before seeding.");
}

function loadEnvFile() {
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function money(amount: number) {
  return amount.toFixed(2);
}

async function seedAccounts(database: ReturnType<typeof drizzle<typeof schema>>) {
  const [existingUser] = await database.select({ id: schema.appUsers.id }).from(schema.appUsers).limit(1);
  if (!existingUser) {
  const accounts = [
    ["operator", "operator", "staff", "Site operator", "OPERATOR"],
    ["manager", "manager", "staff", "Site manager", "MANAGER"],
    ["owner", "owner", "staff", "Owner", "OWNER"],
    ["vendor", "vendor", "vendor", "ABC Supplies", null],
    ["client", "client", "client", "ABC Constructions", null],
  ] as const;
  await database.insert(schema.appUsers).values(
    accounts.map((account) => ({
      username: account[0],
      passwordHash: hashPassword(account[1]),
      kind: account[2],
      displayName: account[3],
      accessRole: account[4],
    })),
  );
  await database.insert(schema.jobRoles).values(seedRoles().map((role) => ({ name: role.name, builtIn: true })));
  const [boq] = await database
    .insert(schema.boqItems)
    .values({ costCode: "CIV-MASN", description: "Block masonry", unit: "sqm", contractQty: "100.00", rate: "450.00", executedQty: "40.00" })
    .returning();
  const [order] = await database
    .insert(schema.purchaseOrders)
    .values({ number: "MI/PO/2026/0001", vendorName: "ABC Supplies", itemName: "Cement", quantity: "50.00", rate: "420.00", issuedOn: "2026-10-20" })
    .returning();
  await database.insert(schema.goodsReceipts).values({ orderId: order.id, quantity: "20.00", receivedOn: "2026-10-21" });
  await database.insert(schema.siteDiary).values({
    entryDate: "2026-10-22",
    projectName: "Compound Wall & Yard Fill",
    weather: "Clear",
    workDone: "Blockwork on the east wall",
    quantity: "12.00",
    unit: "sqm",
  });
  await database.insert(schema.budgetLines).values({ costCode: "CIV-MASN", name: "Block masonry", budgetAmount: "45000.00", actualAmount: "18000.00" });
  await database.insert(schema.drawings).values({ number: "A-101", title: "Compound wall plan", revision: "A", revisedOn: "2026-10-01" });
  await database.insert(schema.rfis).values({ number: "MI/RFI/2026/0001", question: "Confirm the wall height at the gate.", status: "OPEN" });
  await database.insert(schema.submittals).values({ title: "Block sample", specSection: "04 20 00", status: "DRAFT" });
  await database.insert(schema.leaveRequests).values({ staffName: "Rajesh Kumar", startDate: "2026-10-28", endDate: "2026-10-28", reason: "Personal", status: "PENDING" });
  await database.insert(schema.paymentRequests).values({ payee: "ABC Supplies", amount: "8400.00", purpose: "Cement received against MI/PO/2026/0001", status: "PENDING" });
  const [supervisor] = await database.select().from(schema.jobRoles).where(eq(schema.jobRoles.name, "Supervisor")).limit(1);
  const [driver] = await database.select().from(schema.jobRoles).where(eq(schema.jobRoles.name, "Heavy vehicle driver")).limit(1);
  const people = await database.select().from(schema.staff);
  for (const person of people) {
    const role = person.fullName.includes("Rajesh") ? supervisor : driver;
    if (role) {
      await database.insert(schema.staffRoleAssignments).values({ staffId: person.id, roleId: role.id });
      await database.update(schema.staff).set({ role: role.name, address: person.fullName.includes("Rajesh") ? "Kaloor, Kochi" : "" }).where(eq(schema.staff.id, person.id));
    }
  }
  void boq;
  }
  await ensureSuperAdmin(database);
}

async function seed() {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  try {
    await seedAccounts(db);
    const existing = await db
      .select({ id: schema.systemSettings.id })
      .from(schema.systemSettings)
      .limit(1);
    if (existing.length > 0) {
      console.log("Database already has system settings. Account records were checked.");
      return;
    }

    console.log("Seeding backend database...");

    const [settings] = await db
      .insert(schema.systemSettings)
      .values({
        ...defaultSystemSettings,
        gstin: defaultSystemSettings.gstin || null,
        upiId: defaultSystemSettings.upiId || null,
        logoUrl: null,
        signatureUrl: null,
      })
      .returning();

    const [abc, coastal] = await db
      .insert(schema.clients)
      .values([
        {
          name: "ABC Constructions",
          companyName: "ABC Constructions",
          phone: "9800000001",
          address: "Kochi, Kerala",
          email: "accounts@abc.example",
        },
        {
          name: "Coastal Stays",
          companyName: "Coastal Stays",
          phone: "9800000002",
          address: "Alappuzha, Kerala",
          email: "stay@coastal.example",
        },
      ])
      .returning();

    const [yard, villa] = await db
      .insert(schema.projects)
      .values([
        {
          clientId: abc.id,
          name: "Compound Wall & Yard Fill",
          title: "Compound Wall & Yard Fill",
          location: "Kochi, Kerala",
          status: "ACTIVE",
        },
        {
          clientId: coastal.id,
          name: "Guest Villa Monthly Lease",
          title: "Guest Villa Monthly Lease",
          location: "Alappuzha, Kerala",
          status: "ACTIVE",
        },
      ])
      .returning();

    const materials = await db
      .insert(schema.inventoryItems)
      .values([
        {
          name: "M-Sand",
          category: "Aggregates",
          unitType: "CFT",
          centralRate: "45.00",
          currentStock: "1200.00",
          lowStockThreshold: "100.00",
        },
        {
          name: "P-Sand",
          category: "Aggregates",
          unitType: "CFT",
          centralRate: "55.00",
          currentStock: "800.00",
          lowStockThreshold: "100.00",
        },
        {
          name: "20mm Metal",
          category: "Aggregates",
          unitType: "CFT",
          centralRate: "42.00",
          currentStock: "1500.00",
          lowStockThreshold: "100.00",
        },
        {
          name: "Ordinary Portland Cement (OPC)",
          category: "Binder",
          unitType: "Bags",
          centralRate: "380.00",
          currentStock: "400.00",
          lowStockThreshold: "50.00",
        },
      ])
      .returning();

    await db.insert(schema.centralInventory).values([
      {
        itemName: "Quarry Aggregates",
        unitType: "CFT",
        standardUnitRate: "120.00",
        currentStock: "500.00",
        minSafetyThreshold: "40.00",
      },
      {
        itemName: "M-Sand",
        unitType: "Loads",
        standardUnitRate: "4500.00",
        currentStock: "25.00",
        minSafetyThreshold: "5.00",
      },
    ]);

    const mSand = materials[0];
    const totals = calculateInvoiceTotals(
      [
        { quantity: 20, rate: 120 },
        { quantity: 10, rate: 4500, overrideRate: 4200 },
      ],
      { gstEnabled: true, isInterstate: false },
    );

    const [invoice] = await db
      .insert(schema.invoices)
      .values({
        baseInvoiceNumber: "MI/CON/2026/0001",
        invoiceNumber: "MI/CON/2026/0001",
        version: 0,
        isFinalized: true,
        clientId: abc.id,
        projectId: yard.id,
        invoiceType: "CONSTRUCTION",
        subtotal: money(totals.subtotal),
        cgstAmount: money(totals.cgst),
        sgstAmount: money(totals.sgst),
        igstAmount: money(totals.igst),
        totalAmount: money(totals.total),
        cgst: money(totals.cgst),
        sgst: money(totals.sgst),
        igst: money(totals.igst),
        grandTotal: money(totals.total),
        amountPaid: "10000.00",
        paymentStatus: "Partially Paid",
        transitPassNo: "TP-1001",
        ewayBillNo: "EWB-1001",
        letterheadMode: true,
        stationeryMode: false,
        notes: "Payment due within 15 days of issue.",
      })
      .returning();

    await db.insert(schema.ledgerEntries).values([
      {
        projectId: yard.id,
        invoiceId: invoice.id,
        materialName: "Quarry Aggregates",
        quantity: "20.00",
        unitType: "CFT",
        centralRate: "120.00",
        overrideRate: "120.00",
        totalPrice: "2400.00",
        transitPassNumber: "TP-1001",
        ewayBillNumber: "EWB-1001",
        vehicleNumber: "KL-07-AB-1001",
      },
      {
        projectId: yard.id,
        invoiceId: invoice.id,
        materialName: "M-Sand",
        quantity: "10.00",
        unitType: "Loads",
        centralRate: "4500.00",
        overrideRate: "4200.00",
        totalPrice: "42000.00",
      },
    ]);

    await db.insert(schema.invoicePayments).values({
      invoiceId: invoice.id,
      amountPaid: "10000.00",
      paymentMode: "UPI",
      referenceNumber: "UPI-1001",
      notes: "Advance against yard fill",
    });

    const [delivery] = await db
      .insert(schema.deliveryLedger)
      .values({
        projectId: yard.id,
        inventoryItemId: mSand.id,
        invoiceId: invoice.id,
        materialName: mSand.name,
        quantity: "20.00",
        unitType: mSand.unitType,
        centralRate: mSand.centralRate,
        overrideRate: mSand.centralRate,
        totalPrice: "900.00",
        transitPassNo: "TP-1002",
        ewayBillNo: "EWB-1002",
      })
      .returning();

    await db
      .update(schema.inventoryItems)
      .set({ currentStock: "1180.00" })
      .where(eq(schema.inventoryItems.id, mSand.id));

    await db.insert(schema.stockMovements).values({
      inventoryItemId: mSand.id,
      deliveryId: delivery.id,
      direction: "OUT",
      quantity: "20.00",
      balanceAfter: "1180.00",
      reason: "Opening delivery for yard fill",
    });

    const [rajesh, suresh] = await db
      .insert(schema.staff)
      .values([
        {
          fullName: "Rajesh Kumar",
          role: "Site Supervisor",
          dailyBaseRate: "900.00",
          hourlyRate: "120.00",
        },
        {
          fullName: "Suresh P.",
          role: "Heavy Machinery Operator",
          dailyBaseRate: "1100.00",
          hourlyRate: "150.00",
        },
      ])
      .returning();

    await db.insert(schema.attendanceLogs).values([
      {
        staffId: rajesh.id,
        workDate: new Date("2026-10-05T09:00:00+05:30"),
        isPresent: true,
        overtimeHours: "2.00",
      },
      {
        staffId: rajesh.id,
        workDate: new Date("2026-10-06T09:00:00+05:30"),
        isPresent: true,
        overtimeHours: "0.00",
      },
      {
        staffId: suresh.id,
        workDate: new Date("2026-10-06T09:00:00+05:30"),
        isPresent: true,
        overtimeHours: "3.00",
      },
    ]);

    const rajeshPay = calculateStaffPayroll(900, 120, [
      { isPresent: true, overtimeHours: 2 },
      { isPresent: true, overtimeHours: 0 },
    ]);

    await db.insert(schema.payrollSlips).values({
      staffId: rajesh.id,
      periodLabel: "2026-10-05 to 2026-10-06",
      daysPresent: rajeshPay.daysPresent,
      totalOvertimeHours: money(rajeshPay.totalOvertimeHours),
      basePay: money(rajeshPay.basePay),
      overtimePay: money(rajeshPay.overtimePay),
      totalPay: money(rajeshPay.totalPay),
    });

    const [compactor] = await db
      .insert(schema.assets)
      .values({ assetName: "Plate Compactor", assetCode: "AST-001", status: "Assigned" })
      .returning();

    await db.insert(schema.assetAssignments).values({
      assetId: compactor.id,
      assigneeType: "EXTERNAL",
      externalName: "ABC Constructions",
      externalPhone: "9800000001",
      issueDate: "2026-10-01",
      expectedReturnDate: "2026-10-15",
    });

    await db.insert(schema.assetRentals).values({
      assetName: "Plate Compactor",
      borrowerType: "REGISTERED_CLIENT",
      borrowerName: "ABC Constructions",
      borrowerContact: "9800000001",
      dailyRate: "1500.00",
      rentedAt: new Date("2026-10-01T08:00:00+05:30"),
    });

    const [contract] = await db
      .insert(schema.subcontracts)
      .values({
        projectId: yard.id,
        title: "Masonry labour gang",
        leadPersonType: "EXTERNAL",
        externalLeadName: "Anil Crew",
        externalLeadPhone: "9800000099",
        totalContractAmount: "250000.00",
        teamMembers: [{ name: "Anil Crew" }],
      })
      .returning();

    await db.insert(schema.subcontractDraws).values({
      subcontractId: contract.id,
      amountPaid: "50000.00",
      paymentMode: "Bank Transfer",
      notes: "First draw",
    });

    await db.insert(schema.invoices).values({
      baseInvoiceNumber: "MI/RES/2026/0001",
      invoiceNumber: "MI/RES/2026/0001",
      version: 0,
      isFinalized: true,
      clientId: coastal.id,
      projectId: villa.id,
      invoiceType: "RESORT",
      subtotal: "25000.00",
      cgstAmount: "0.00",
      sgstAmount: "0.00",
      igstAmount: "0.00",
      totalAmount: "25000.00",
      cgst: "0.00",
      sgst: "0.00",
      igst: "0.00",
      grandTotal: "25000.00",
      letterheadMode: true,
      notes: "Guest villa monthly lease",
    });

    await db.insert(schema.auditLogs).values({
      userId: settings.id,
      action: "SEED",
      tableName: "system_settings",
      recordId: settings.id,
      newData: { source: "db/seed.ts" },
    });

    console.log("Database seeded successfully.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
