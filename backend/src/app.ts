import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { config } from "./config";
import { emailQueue } from "./queue/emailQueue";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { basicAuth } from "./middleware/basicAuth";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json({ limit: "10mb" }));

  const boardAdapter = new ExpressAdapter();
  boardAdapter.setBasePath("/admin/queues");
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: boardAdapter });
  app.use("/admin/queues", basicAuth, boardAdapter.getRouter());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
