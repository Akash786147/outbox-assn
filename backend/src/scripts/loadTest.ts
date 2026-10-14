// Schedules a big batch for one user to see rate limiting in action.
// usage: npm run load-test -- you@example.com 1000 50
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { ensureSenders, listSenders } from "../services/senderService";
import { scheduleEmails } from "../services/emailService";

async function main() {
  const [email, total = "1000", hourlyLimit = "50"] = process.argv.slice(2);
  if (!email) throw new Error("Pass the email of a logged-in user");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`No user with email ${email}, log in once from the dashboard first`);

  await ensureSenders();
  const [sender] = await listSenders();

  const recipients = Array.from({ length: Number(total) }, (_, i) => `lead${i + 1}@example.com`);
  const result = await scheduleEmails(user.id, {
    senderId: sender.id,
    subject: "Load test",
    body: "<p>Hello from the load test</p>",
    recipients,
    delaySeconds: 0,
    hourlyLimit: Number(hourlyLimit),
  });

  console.log(`Scheduled ${result.count} emails in batch ${result.batchId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
