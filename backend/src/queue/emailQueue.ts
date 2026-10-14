import { Queue } from "bullmq";
import { config } from "../config";
import { bullConnection } from "../lib/redis";

export const EMAIL_QUEUE = "email-queue";

export interface EmailJobData {
  emailId: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: config.jobAttempts,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// jobId comes from the email row, so the same email can never be queued twice
export const jobIdFor = (emailId: number) => `email-${emailId}`;

export async function enqueueEmails(items: { id: number; scheduledAt: Date }[]) {
  const now = Date.now();
  const CHUNK = 500;

  for (let i = 0; i < items.length; i += CHUNK) {
    const jobs = items.slice(i, i + CHUNK).map((item) => ({
      name: "send-email",
      data: { emailId: item.id },
      opts: { jobId: jobIdFor(item.id), delay: Math.max(0, item.scheduledAt.getTime() - now) },
    }));
    await emailQueue.addBulk(jobs);
  }
}
