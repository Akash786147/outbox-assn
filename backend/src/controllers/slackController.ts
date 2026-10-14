import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { config } from "../config";
import { exchangeSlackCode, getSlackAuthorizeUrl, notifyUser } from "../services/slackService";
import { signToken, verifyToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

// state carries the user id (signed) because the callback comes from Slack, not our frontend
export async function connectUrl(req: Request, res: Response) {
  if (!config.slack.clientId) throw new HttpError(500, "Slack is not configured on the server");
  const state = signToken({ userId: req.userId, purpose: "slack" }, "10m");
  res.json({ url: getSlackAuthorizeUrl(state) });
}

export async function callback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const redirect = (status: string) => res.redirect(`${config.frontendUrl}/scheduled?slack=${status}`);

  if (error || !code || !state) return redirect("cancelled");

  try {
    const { userId } = verifyToken<{ userId: number }>(state);
    const slack = await exchangeSlackCode(code);

    await db
      .update(users)
      .set({ slackWebhookUrl: slack.webhookUrl, slackChannel: slack.channel, slackTeam: slack.team })
      .where(eq(users.id, userId));

    await notifyUser(userId, ":white_check_mark: Email Scheduler connected. You'll get a message here when a sender hits its hourly limit.");
    redirect("connected");
  } catch (err) {
    console.error("Slack callback failed:", (err as Error).message);
    redirect("error");
  }
}

export async function disconnect(req: Request, res: Response) {
  await db
    .update(users)
    .set({ slackWebhookUrl: null, slackChannel: null, slackTeam: null })
    .where(eq(users.id, req.userId));
  res.status(204).end();
}

export async function test(req: Request, res: Response) {
  await notifyUser(req.userId, ":wave: Test message from Email Scheduler");
  res.json({ ok: true });
}
