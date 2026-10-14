import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) throw new HttpError(401, "Not logged in");

  try {
    req.userId = verifyToken<{ userId: number }>(token).userId;
    next();
  } catch {
    throw new HttpError(401, "Session expired, please log in again");
  }
}
