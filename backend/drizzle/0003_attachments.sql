CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "attachments_batch_idx" ON "attachments" USING btree ("batch_id");