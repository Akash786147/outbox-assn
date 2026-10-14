import { Request, Response } from "express";
import { z } from "zod";
import { getUserById, loginWithGoogle, loginWithPassword, toPublicUser } from "../services/authService";

const googleSchema = z.object({ code: z.string().min(1, "Missing Google code") });

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function googleLogin(req: Request, res: Response) {
  const { code } = googleSchema.parse(req.body);
  res.json(await loginWithGoogle(code));
}

export async function passwordLogin(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  res.json(await loginWithPassword(email.toLowerCase(), password));
}

export async function me(req: Request, res: Response) {
  const user = await getUserById(req.userId);
  res.json(toPublicUser(user));
}
