import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { attachments, emails } from "../db/schema";
import { HttpError } from "../utils/httpError";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENTS_BYTES = 5 * 1024 * 1024;

export interface AttachmentInput {
  filename: string;
  contentType: string;
  content: string; // base64
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function decodeAttachments(input: AttachmentInput[]) {
  const files = input.map((file) => {
    const content = Buffer.from(file.content, "base64");
    return { filename: file.filename, contentType: file.contentType || "application/octet-stream", size: content.length, content };
  });

  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_ATTACHMENTS_BYTES) throw new HttpError(400, "Attachments can be 5 MB in total");
  return files;
}

export async function saveAttachments(tx: Tx, batchId: string, files: ReturnType<typeof decodeAttachments>) {
  if (files.length === 0) return;
  await tx.insert(attachments).values(files.map((file) => ({ ...file, batchId })));
}

const metaColumns = {
  id: attachments.id,
  filename: attachments.filename,
  contentType: attachments.contentType,
  size: attachments.size,
};

export function listAttachmentMeta(batchId: string) {
  return db.select(metaColumns).from(attachments).where(eq(attachments.batchId, batchId));
}

// what nodemailer needs when sending
export function getBatchAttachments(batchId: string) {
  return db
    .select({ filename: attachments.filename, contentType: attachments.contentType, content: attachments.content })
    .from(attachments)
    .where(eq(attachments.batchId, batchId));
}

export async function getAttachmentForUser(userId: number, id: number) {
  const [file] = await db
    .select({ filename: attachments.filename, contentType: attachments.contentType, content: attachments.content })
    .from(attachments)
    .innerJoin(emails, and(eq(emails.batchId, attachments.batchId), eq(emails.userId, userId)))
    .where(eq(attachments.id, id))
    .limit(1);

  if (!file) throw new HttpError(404, "Attachment not found");
  return file;
}
