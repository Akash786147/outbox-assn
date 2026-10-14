import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { config } from "../config";

const redirectUri = () => `${config.backendUrl}/api/slack/callback`;

export function getSlackAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri(),
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  team?: { name: string };
  incoming_webhook?: { url: string; channel: string };
}

export async function exchangeSlackCode(code: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: redirectUri(),
    }),
  });

  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.incoming_webhook) throw new Error(data.error ?? "Slack OAuth failed");

  return {
    webhookUrl: data.incoming_webhook.url,
    channel: data.incoming_webhook.channel,
    team: data.team?.name ?? "",
  };
}

// reads the webhook from the DB every time, so connect/disconnect works without a restart
export async function notifyUser(userId: number, text: string) {
  const [user] = await db.select({ webhook: users.slackWebhookUrl }).from(users).where(eq(users.id, userId));
  if (!user?.webhook) return;

  try {
    const res = await fetch(user.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error("Slack webhook responded with", res.status);
  } catch (err) {
    console.error("Slack notification failed:", (err as Error).message);
  }
}
