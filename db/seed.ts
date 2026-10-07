import { existsSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { calculateInvoiceTotals } from "../lib/engines/invoice-engine";
import { calculateStaffPayroll } from "../lib/engines/payroll-engine";
import * as schema from "./schema";

loadEnvFile();

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/mattel_infrastructures";

function loadEnvFile() {
  if (!existsSync(".env")) {
    return;
  }

  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
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

function money(amount: number) {
  return amount.toFixed(2);
}

async function seed() {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  try {
    const existing = await db
      .select({ id: schema.systemSettings.id })
      .from(schema.systemSettings)
      .limit(1);
    if (existing.length > 0) {
      console.log("Database already has system settings. Seed skipped.");
      return;
    }

    console.log("Seeding backend database...");

    const [settings] = await db
      .insert(schema.systemSettings)
      .values({
        companyName: "Mattel Infrastructures",
        tagline: "Building Tomorrow's Foundation",
        address: "Kerala, India",
        phone: "+91 98765 43210",
        email: "contact@mattelinfra.com",
        bankName: "State Bank of India",
        accountName: "Mattel Infrastructures Operating Account",
        accountNumber: "40910029831",
        ifscCode: "SBIN0001234",
        unitTypes: ["Loads", "Bags", "CFT", "Tons", "Hours", "Days", "Trips"],
        defaultTerms: "Payment due within 15 days of issue.",
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
