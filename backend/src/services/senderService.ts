import nodemailer, { Transporter } from "nodemailer";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { senders, Sender } from "../db/schema";
import { config } from "../config";

const NAMES = ["Outreach Team", "Sales Desk", "Growth Team", "Partnerships", "Hello Team"];

// Ethereal accounts are created once and saved in the DB so they survive restarts
export async function ensureSenders() {
  const existing = await db.select().from(senders);
  const missing = config.etherealSenderCount - existing.length;

  for (let i = 0; i < missing; i++) {
    const account = await nodemailer.createTestAccount();
    await db.insert(senders).values({
      name: NAMES[(existing.length + i) % NAMES.length],
      email: account.user,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass,
    });
    console.log(`Created Ethereal sender ${account.user}`);
  }
}

export function listSenders() {
  return db
    .select({ id: senders.id, name: senders.name, email: senders.email })
    .from(senders)
    .orderBy(asc(senders.id));
}

export async function getSender(id: number) {
  const [sender] = await db.select().from(senders).where(eq(senders.id, id));
  return sender;
}

const transporters = new Map<number, Transporter>();

export function getTransporter(sender: Sender) {
  let transporter = transporters.get(sender.id);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
    });
    transporters.set(sender.id, transporter);
  }
  return transporter;
}
