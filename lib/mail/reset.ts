import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

export async function sendPasswordResetEmail(to: string, name: string, link: string) {
  const host = process.env.SMTP_HOST?.trim();
  const [settings] = await db.select().from(systemSettings).where(isNull(systemSettings.deletedAt)).limit(1);
  const company = settings?.companyName || "Mattel Infrastructures";
  const from = process.env.SMTP_FROM?.trim() || settings?.email || "";
  if (!host || !from) {
    return { sent: false as const, message: "The reset was prepared, but SMTP_HOST and a from address are not set, so the email was not sent." };
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
    to,
    subject: `Reset your ${company} password`,
    text: `Hello ${name},\n\nAn admin asked to reset your password. Open this link within one hour:\n\n${link}\n\nIf you did not expect this, you can ignore it.\n`,
  });
  return { sent: true as const, message: `Reset link sent to ${to}.` };
}

export function newResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}
