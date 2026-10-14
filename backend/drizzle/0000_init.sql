CREATE TYPE "public"."email_status" AS ENUM('scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"batch_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "email_status" DEFAULT 'scheduled' NOT NULL,
	"hourly_limit" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"message_id" text,
	"preview_url" text,
	"error" text,
	"starred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "senders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"smtp_host" text NOT NULL,
	"smtp_port" integer NOT NULL,
	"smtp_user" text NOT NULL,
	"smtp_pass" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "senders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"google_id" text,
	"password_hash" text,
	"slack_webhook_url" text,
	"slack_channel" text,
	"slack_team" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_id_senders_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."senders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_user_status_idx" ON "emails" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "emails_batch_idx" ON "emails" USING btree ("batch_id");