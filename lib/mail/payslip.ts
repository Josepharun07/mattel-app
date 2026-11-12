import nodemailer from "nodemailer";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { formatInr } from "@/lib/money";

export async function sendPayslipEmail(input: {
  to: string;
  name: string;
  payslipNumber: string;
  periodStart: string;
  periodEnd: string;
  daysPresent: number;
  overtimeHours: number;
  gross: number;
  deductions: number;
  netPaid: number;
}) {
  const host = process.env.SMTP_HOST?.trim();
  const [settings] = await db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1);
  const company = settings?.companyName || "Mattel Infrastructures";
  const from = process.env.SMTP_FROM?.trim() || settings?.email || "";
  if (!host || !from) {
    return { sent: false as const, message: "The payout is saved. Set SMTP_HOST and a from address to email the payslip." };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });
  await transporter.sendMail({
    from,
    to: input.to,
    subject: `${company} payslip ${input.payslipNumber}`,
    text: [
      `Hello ${input.name},`,
      "",
      `Your payslip ${input.payslipNumber} is ready.`,
      `Period: ${input.periodStart} to ${input.periodEnd}`,
      `Days: ${input.daysPresent}`,
      `Overtime hours: ${input.overtimeHours}`,
      `Gross: ${formatInr(input.gross)}`,
      `Advances deducted: ${formatInr(input.deductions)}`,
      `Net paid: ${formatInr(input.netPaid)}`,
      "",
      company,
    ].join("\n"),
  });
  return { sent: true as const, message: `Payslip emailed to ${input.to}.` };
}
