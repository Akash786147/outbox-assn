import { sql } from "drizzle-orm";
import { boolean, customType, index, integer, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const emailStatus = pgEnum("email_status", ["scheduled", "sending", "sent", "failed"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  googleId: text("google_id").unique(),
  passwordHash: text("password_hash"),
  slackWebhookUrl: text("slack_webhook_url"),
  slackChannel: text("slack_channel"),
  slackTeam: text("slack_team"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const senders = pgTable("senders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPass: text("smtp_pass").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emails = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    senderId: integer("sender_id").notNull().references(() => senders.id),
    batchId: uuid("batch_id").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: emailStatus("status").default("scheduled").notNull(),
    hourlyLimit: integer("hourly_limit").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    sentAt: timestamp("sent_at"),
    messageId: text("message_id"),
    previewUrl: text("preview_url"),
    error: text("error"),
    starred: boolean("starred").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // kept up to date by Postgres itself, subject ranks higher than recipient and body
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', subject), 'A') || setweight(to_tsvector('simple', to_email), 'B') || setweight(to_tsvector('english', regexp_replace(body, '<[^>]*>', ' ', 'g')), 'C')`,
    ),
  },
  (t) => [
    index("emails_user_status_idx").on(t.userId, t.status),
    index("emails_batch_idx").on(t.batchId),
    index("emails_search_idx").using("gin", t.searchVector),
    index("emails_to_email_trgm_idx").using("gin", t.toEmail.op("gin_trgm_ops")),
  ],
);

// files are shared by every email in a batch and stored in the DB so they survive restarts
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    batchId: uuid("batch_id").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    content: bytea("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("attachments_batch_idx").on(t.batchId)],
);

export type User = typeof users.$inferSelect;
export type Sender = typeof senders.$inferSelect;
export type Email = typeof emails.$inferSelect;
