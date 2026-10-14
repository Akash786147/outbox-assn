import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db";
import { users, User } from "../db/schema";
import { config } from "../config";
import { HttpError } from "../utils/httpError";
import { signToken } from "../utils/jwt";

// "postmessage" is the redirect uri used by the Google popup (auth-code) flow
const googleClient = new OAuth2Client(config.google.clientId, config.google.clientSecret, "postmessage");

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    slack: {
      connected: Boolean(user.slackWebhookUrl),
      channel: user.slackChannel,
      team: user.slackTeam,
    },
  };
}

const withToken = (user: User) => ({ token: signToken({ userId: user.id }), user: toPublicUser(user) });

export async function loginWithGoogle(code: string) {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) throw new HttpError(401, "Google did not return an id token");

  const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: config.google.clientId });
  const profile = ticket.getPayload();
  if (!profile?.email) throw new HttpError(401, "Google account has no email");

  const values = {
    email: profile.email,
    name: profile.name ?? profile.email.split("@")[0],
    avatar: profile.picture ?? null,
    googleId: profile.sub,
  };

  const [user] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.email, set: { name: values.name, avatar: values.avatar, googleId: values.googleId } })
    .returning();

  return withToken(user);
}

// logs in an existing email user, or signs them up if the email is new
export async function loginWithPassword(email: string, password: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    if (!existing.passwordHash) throw new HttpError(400, "This account uses Google login");
    const valid = await bcrypt.compare(password, existing.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");
    return withToken(existing);
  }

  const [user] = await db
    .insert(users)
    .values({ email, name: email.split("@")[0], passwordHash: await bcrypt.hash(password, 10) })
    .returning();

  return withToken(user);
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new HttpError(401, "User not found");
  return user;
}
