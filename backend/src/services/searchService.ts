import { ilike, or, sql } from "drizzle-orm";
import { elastic, EMAIL_INDEX } from "../lib/elastic";
import { Email, emails } from "../db/schema";

// Postgres full-text search on the indexed search_vector column (GIN),
// every word is a prefix match so "foll" finds "follow up".
// The recipient also gets a trigram (ILIKE) match so "john" finds "john@acme.com".
export function postgresSearchFilter(query: string) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const emailMatch = ilike(emails.toEmail, `%${query.replace(/[%_\\]/g, "\\$&")}%`);
  if (words.length === 0) return emailMatch;

  const tsQuery = words.map((w) => `${w}:*`).join(" & ");
  return or(sql`${emails.searchVector} @@ to_tsquery('english', ${tsQuery})`, emailMatch)!;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function ensureIndex() {
  if (!elastic) return;
  const exists = await elastic.indices.exists({ index: EMAIL_INDEX });
  if (exists) return;

  await elastic.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        userId: { type: "integer" },
        toEmail: { type: "text", fields: { keyword: { type: "keyword" } } },
        subject: { type: "text" },
        body: { type: "text" },
        status: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
      },
    },
  });
}

function toDoc(email: Email) {
  return {
    userId: email.userId,
    toEmail: email.toEmail,
    subject: email.subject,
    body: stripHtml(email.body),
    status: email.status,
    scheduledAt: email.scheduledAt,
    sentAt: email.sentAt,
  };
}

// search is only a secondary index, so a failure here should never break sending
export async function indexEmails(items: Email[]) {
  if (!elastic || items.length === 0) return;
  try {
    const operations = items.flatMap((email) => [
      { index: { _index: EMAIL_INDEX, _id: String(email.id) } },
      toDoc(email),
    ]);
    await elastic.bulk({ operations });
  } catch (err) {
    console.error("Elasticsearch indexing failed:", (err as Error).message);
  }
}

// returns null when Elasticsearch is not configured so the caller can fall back to the DB
export async function searchEmailIds(userId: number, query: string, statuses: string[]) {
  if (!elastic) return null;

  const result = await elastic.search({
    index: EMAIL_INDEX,
    size: 100,
    query: {
      bool: {
        must: {
          multi_match: { query, fields: ["subject^2", "toEmail", "body"], fuzziness: "AUTO" },
        },
        filter: [{ term: { userId } }, { terms: { status: statuses } }],
      },
    },
  });

  return result.hits.hits.map((hit) => Number(hit._id));
}
