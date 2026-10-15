import { Router, type Request, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";
import { ah, HttpError, parse } from "./http";

export interface AuthUser {
  id: string;
  role: "ADMIN" | "OFFICER";
  hospitalId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const sign = (u: AuthUser) => jwt.sign(u, env.JWT_SECRET, { expiresIn: "7d" });

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return next(new HttpError(401, "Sign in to continue"));
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = { id: p.id, role: p.role, hospitalId: p.hospitalId };
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Sign in again."));
  }
};

export const me = (req: Request): AuthUser => {
  if (!req.user) throw new HttpError(401, "Sign in to continue");
  return req.user;
};

export const requireAdmin: RequestHandler = (req, _res, next) =>
  next(req.user?.role === "ADMIN" ? undefined : new HttpError(403, "Only CareBridge administrators can do this"));

const session = (u: { id: string; name: string; email: string; role: AuthUser["role"]; hospital: { id: string; name: string; state: string } | null }) => ({
  user: { id: u.id, name: u.name, email: u.email, role: u.role },
  hospital: u.hospital ? { id: u.hospital.id, name: u.hospital.name, state: u.hospital.state } : null,
});

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?\d{10,14}$/, "Enter a valid phone number"),
  jobTitle: z.string().min(2).max(80),
  hospitalId: z.string().uuid(),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** Hospital officers sign up, then wait for a CareBridge admin to approve them. */
authRoutes.post(
  "/register",
  ah(async (req, res) => {
    const input = parse(registerSchema, req.body);
    if (await db.user.findUnique({ where: { email: input.email.toLowerCase() } })) throw new HttpError(409, "An account with this email already exists");
    if (!(await db.hospital.findUnique({ where: { id: input.hospitalId } }))) throw new HttpError(404, "Hospital not found");
    const { password, ...profile } = input;
    await db.user.create({
      data: { ...profile, email: input.email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), role: "OFFICER" },
    });
    res.status(201).json({ ok: true, message: "Thank you. A CareBridge administrator will confirm your role with the hospital and approve your account." });
  }),
);

authRoutes.post(
  "/login",
  ah(async (req, res) => {
    const input = parse(z.object({ email: z.string().email(), password: z.string().min(1) }), req.body);
    const u = await db.user.findUnique({ where: { email: input.email.toLowerCase() }, include: { hospital: true } });
    if (!u || !(await bcrypt.compare(input.password, u.passwordHash))) throw new HttpError(401, "Email or password is incorrect");
    if (!u.approved) throw new HttpError(403, "Your account is waiting for approval by a CareBridge administrator");
    res.json({ token: sign({ id: u.id, role: u.role, hospitalId: u.hospitalId }), ...session(u) });
  }),
);

authRoutes.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    const u = await db.user.findUniqueOrThrow({ where: { id: me(req).id }, include: { hospital: true } });
    res.json(session(u));
  }),
);
