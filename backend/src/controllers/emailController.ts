import { Request, Response } from "express";
import { z } from "zod";
import { getEmail, getStats, listEmails, scheduleEmails, toggleStar } from "../services/emailService";
import { listSenders } from "../services/senderService";

const scheduleSchema = z.object({
  senderId: z.number().int().positive("Pick a sender"),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  body: z.string().min(1, "Body is required"),
  recipients: z.array(z.email("One of the recipients is not a valid email")).min(1, "Add at least one recipient").max(10000),
  startTime: z.iso.datetime().optional(),
  delaySeconds: z.number().int().min(0).max(3600),
  hourlyLimit: z.number().int().min(1, "Hourly limit must be at least 1"),
});

const listSchema = z.object({
  tab: z.enum(["scheduled", "sent"]).default("scheduled"),
  status: z.enum(["scheduled", "sending", "sent", "failed"]).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const idSchema = z.coerce.number().int().positive();

export async function schedule(req: Request, res: Response) {
  const input = scheduleSchema.parse(req.body);
  res.status(201).json(await scheduleEmails(req.userId, input));
}

export async function list(req: Request, res: Response) {
  const options = listSchema.parse(req.query);
  res.json(await listEmails(req.userId, options));
}

export async function stats(req: Request, res: Response) {
  res.json(await getStats(req.userId));
}

export async function getOne(req: Request, res: Response) {
  res.json(await getEmail(req.userId, idSchema.parse(req.params.id)));
}

export async function star(req: Request, res: Response) {
  res.json(await toggleStar(req.userId, idSchema.parse(req.params.id)));
}

export async function senders(_req: Request, res: Response) {
  res.json(await listSenders());
}
