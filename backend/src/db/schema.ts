import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  },
  (t) => [index("emails_user_status_idx").on(t.userId, t.status), index("emails_batch_idx").on(t.batchId)],
);

export type User = typeof users.$inferSelect;
export type Sender = typeof senders.$inferSelect;
export type Email = typeof emails.$inferSelect;
