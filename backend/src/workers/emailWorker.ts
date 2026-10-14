import { DelayedError, Job, Worker } from "bullmq";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { emails, Email, Sender } from "../db/schema";
import { config } from "../config";
import { bullConnection } from "../lib/redis";
import { EMAIL_QUEUE, EmailJobData } from "../queue/emailQueue";
import { getSender, getTransporter } from "../services/senderService";
import { getBatchAttachments } from "../services/attachmentService";
import { nextAvailableTime, reserveSendSlot, shouldNotify } from "../services/rateLimiter";
import { indexEmails } from "../services/searchService";
import { notifyUser } from "../services/slackService";

async function updateEmail(id: number, values: Partial<Email>) {
  const [updated] = await db.update(emails).set(values).where(eq(emails.id, id)).returning();
  await indexEmails([updated]);
  return updated;
}

async function handleRateLimit(email: Email, sender: Sender, reason: "sender" | "batch") {
  const runAt = nextAvailableTime(email.scheduledAt);
  await updateEmail(email.id, { scheduledAt: runAt });

  const notifyKey = reason === "sender" ? `sender:${sender.id}:user:${email.userId}` : `batch:${email.batchId}`;
  if (await shouldNotify(notifyKey)) {
    const limit = reason === "sender" ? config.maxPerHourPerSender : email.hourlyLimit;
    const who = reason === "sender" ? `Sender *${sender.email}*` : `Campaign "${email.subject}"`;
    await notifyUser(
      email.userId,
      `:warning: ${who} hit its hourly limit of ${limit} emails. Remaining emails are rescheduled from ${runAt.toLocaleString()}.`,
    );
  }

  return runAt;
}

async function processEmail(job: Job<EmailJobData>, token?: string) {
  const [email] = await db.select().from(emails).where(eq(emails.id, job.data.emailId));

  // idempotency: anything already finished is never sent again
  if (!email || email.status === "sent" || email.status === "failed") return;

  const sender = await getSender(email.senderId);

  const slot = await reserveSendSlot({
    senderId: sender.id,
    batchId: email.batchId,
    senderLimit: config.maxPerHourPerSender,
    batchLimit: email.hourlyLimit,
  });

  if (!slot.allowed) {
    const runAt = await handleRateLimit(email, sender, slot.reason);
    await job.moveToDelayed(runAt.getTime(), token);
    throw new DelayedError();
  }

  await updateEmail(email.id, { status: "sending" });

  try {
    const files = await getBatchAttachments(email.batchId);
    const info = await getTransporter(sender).sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email.toEmail,
      subject: email.subject,
      html: email.body,
      attachments: files,
      messageId: `<email-${email.id}@email-scheduler.local>`,
    });

    await updateEmail(email.id, {
      status: "sent",
      sentAt: new Date(),
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
      error: null,
    });
  } catch (err) {
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await updateEmail(email.id, {
      status: isLastAttempt ? "failed" : "scheduled",
      error: (err as Error).message,
      ...(isLastAttempt && { sentAt: new Date() }),
    });
    throw err;
  }
}

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE, processEmail, {
    connection: bullConnection,
    concurrency: config.workerConcurrency,
    // the limiter lives in Redis, so the min gap between sends holds across all workers
    limiter: { max: 1, duration: config.minDelayMs },
  });

  worker.on("completed", (job) => console.log(`Job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed: ${err.message}`));
  worker.on("error", (err) => console.error("Worker error:", err.message));

  console.log(
    `Email worker started (concurrency=${config.workerConcurrency}, minDelay=${config.minDelayMs}ms, perSender=${config.maxPerHourPerSender}/h)`,
  );
  return worker;
}
