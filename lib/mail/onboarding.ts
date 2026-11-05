import { isNull } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

export async function sendOnboardingEmail(to: string, name: string) {
  const host = process.env.SMTP_HOST?.trim();
  const [settings] = await db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1);
  const company = settings?.companyName || "Mattel Infrastructures";
  const from = process.env.SMTP_FROM?.trim() || settings?.email || "";
  if (!host || !from) {
    return { sent: false as const, message: "The staff record was saved. Set SMTP_HOST and SMTP_FROM to send the onboarding email." };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
      : undefined,
  });
  await transporter.sendMail({
    from,
    to,
    subject: `Welcome to ${company}`,
    text: `Hello ${name},\n\nYour staff record at ${company} is ready. Your administrator will share how to sign in.\n`,
  });
  return { sent: true as const, message: `Onboarding email sent to ${to}.` };
}
