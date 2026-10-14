import jwt from "jsonwebtoken";
import { config } from "../config";

export function signToken(payload: object, expiresIn: jwt.SignOptions["expiresIn"] = "7d") {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken<T>(token: string) {
  return jwt.verify(token, config.jwtSecret) as T;
}
