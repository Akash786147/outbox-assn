import { createApp } from "./app";
import { config } from "./config";
import { runMigrations } from "./db/migrate";
import { ensureSenders } from "./services/senderService";
import { ensureIndex } from "./services/searchService";
import { recoverPendingEmails } from "./services/emailService";
import { createEmailWorker } from "./workers/emailWorker";

async function main() {
  await runMigrations();
  await ensureSenders();
  await ensureIndex().catch((err) => console.error("Elasticsearch unavailable:", err.message));

  const recovered = await recoverPendingEmails();
  console.log(`Checked ${recovered} pending emails against the queue`);

  if (config.runWorker) createEmailWorker();

  createApp().listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
    console.log(`Queue dashboard on http://localhost:${config.port}/admin/queues`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
