import { randomUUID } from "crypto";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { emails, senders } from "../db/schema";
import { enqueueEmails } from "../queue/emailQueue";
import { indexEmails, searchEmailIds } from "./searchService";
import { HttpError } from "../utils/httpError";

export type EmailTab = "scheduled" | "sent";
type Status = (typeof emails.status.enumValues)[number];

const TAB_STATUSES: Record<EmailTab, Status[]> = {
  scheduled: ["scheduled", "sending"],
  sent: ["sent", "failed"],
};

const INSERT_CHUNK = 1000;

export interface ScheduleInput {
  senderId: number;
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export async function scheduleEmails(userId: number, input: ScheduleInput) {
  const [sender] = await db.select({ id: senders.id }).from(senders).where(eq(senders.id, input.senderId));
  if (!sender) throw new HttpError(400, "Sender not found");

  const recipients = [...new Set(input.recipients.map((r) => r.trim().toLowerCase()))];
  const start = Math.max(Date.now(), input.startTime ? new Date(input.startTime).getTime() : 0);
  const batchId = randomUUID();

  const rows = recipients.map((toEmail, i) => ({
    userId,
    senderId: sender.id,
    batchId,
    toEmail,
    subject: input.subject,
    body: input.body,
    hourlyLimit: input.hourlyLimit,
    scheduledAt: new Date(start + i * input.delaySeconds * 1000),
  }));

  // the DB is the source of truth, so rows are saved before anything goes to the queue
  const created = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    created.push(...(await db.insert(emails).values(rows.slice(i, i + INSERT_CHUNK)).returning()));
  }

  await enqueueEmails(created);
  await indexEmails(created);

  return {
    batchId,
    count: created.length,
    firstScheduledAt: created[0]?.scheduledAt,
    lastScheduledAt: created[created.length - 1]?.scheduledAt,
  };
}

const emailColumns = {
  id: emails.id,
  toEmail: emails.toEmail,
  subject: emails.subject,
  body: emails.body,
  status: emails.status,
  scheduledAt: emails.scheduledAt,
  sentAt: emails.sentAt,
  previewUrl: emails.previewUrl,
  error: emails.error,
  starred: emails.starred,
  senderName: senders.name,
  senderEmail: senders.email,
};

interface ListOptions {
  tab: EmailTab;
  status?: Status;
  q?: string;
  page: number;
  limit: number;
}

export async function listEmails(userId: number, { tab, status, q, page, limit }: ListOptions) {
  const statuses = status && TAB_STATUSES[tab].includes(status) ? [status] : TAB_STATUSES[tab];
  const filters = [eq(emails.userId, userId), inArray(emails.status, statuses)];

  if (q) {
    const ids = await searchEmailIds(userId, q, statuses);
    if (ids) {
      if (ids.length === 0) return { items: [], nextPage: null };
      filters.push(inArray(emails.id, ids));
    } else {
      const pattern = `%${q}%`;
      filters.push(or(ilike(emails.subject, pattern), ilike(emails.toEmail, pattern))!);
    }
  }

  const order = tab === "scheduled" ? [asc(emails.scheduledAt), asc(emails.id)] : [desc(emails.sentAt), desc(emails.id)];

  const items = await db
    .select(emailColumns)
    .from(emails)
    .innerJoin(senders, eq(emails.senderId, senders.id))
    .where(and(...filters))
    .orderBy(...order)
    .limit(limit + 1)
    .offset((page - 1) * limit);

  const hasMore = items.length > limit;
  return { items: items.slice(0, limit), nextPage: hasMore ? page + 1 : null };
}

export async function getEmail(userId: number, id: number) {
  const [email] = await db
    .select(emailColumns)
    .from(emails)
    .innerJoin(senders, eq(emails.senderId, senders.id))
    .where(and(eq(emails.id, id), eq(emails.userId, userId)));

  if (!email) throw new HttpError(404, "Email not found");
  return email;
}

export async function toggleStar(userId: number, id: number) {
  const email = await getEmail(userId, id);
  await db.update(emails).set({ starred: !email.starred }).where(eq(emails.id, id));
  return { starred: !email.starred };
}

export async function getStats(userId: number) {
  const rows = await db
    .select({ status: emails.status, total: count() })
    .from(emails)
    .where(eq(emails.userId, userId))
    .groupBy(emails.status);

  const sumOf = (tab: EmailTab) =>
    rows.filter((r) => TAB_STATUSES[tab].includes(r.status)).reduce((sum, r) => sum + r.total, 0);

  return { scheduled: sumOf("scheduled"), sent: sumOf("sent") };
}

// on boot, put back any pending email whose job went missing (e.g. Redis was wiped).
// existing jobs are left untouched because their jobId already exists.
export async function recoverPendingEmails() {
  const pending = await db
    .select({ id: emails.id, scheduledAt: emails.scheduledAt })
    .from(emails)
    .where(inArray(emails.status, TAB_STATUSES.scheduled));

  await enqueueEmails(pending);
  return pending.length;
}
