import { NextFunction, Request, Response } from "express";
import { config } from "../config";

// simple protection for the bull-board UI, skipped when no credentials are set
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  if (!config.adminUser) return next();

  const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
  const [user, pass] = Buffer.from(encoded ?? "", "base64").toString().split(":");

  if (scheme === "Basic" && user === config.adminUser && pass === config.adminPassword) return next();

  res.set("WWW-Authenticate", 'Basic realm="queues"').status(401).send("Authentication required");
}
