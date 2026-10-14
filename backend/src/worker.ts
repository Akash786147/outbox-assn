import { createEmailWorker } from "./workers/emailWorker";
import { ensureIndex } from "./services/searchService";

async function main() {
  await ensureIndex().catch((err) => console.error("Elasticsearch unavailable:", err.message));
  const worker = createEmailWorker();

  // let in-flight jobs finish before exiting, unfinished ones are picked up on next start
  const shutdown = async () => {
    console.log("Shutting down worker...");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
