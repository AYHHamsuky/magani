import { Router, type Request, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, settingsSchema } from "@magani/shared";
import { db } from "./db";
import { env } from "./env";
import { ah, HttpError, parse } from "./http";

export interface AuthUser {
  id: string;
  pharmacyId: string;
  role: "OWNER" | "STAFF";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const sign = (u: AuthUser) => jwt.sign(u, env.JWT_SECRET, { expiresIn: "30d" });

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return next(new HttpError(401, "Sign in to continue"));
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = { id: p.id, pharmacyId: p.pharmacyId, role: p.role };
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Sign in again."));
  }
};

export const me = (req: Request): AuthUser => {
  if (!req.user) throw new HttpError(401, "Sign in to continue");
  return req.user;
};

export const authRoutes = Router();

type UserWithPharmacy = { id: string; name: string; role: AuthUser["role"]; pharmacy: { id: string; name: string; outletType: string; state: string; lga: string; acceptsOrders: boolean } };

const session = (u: UserWithPharmacy) => ({
  user: { id: u.id, name: u.name, role: u.role },
  pharmacy: { id: u.pharmacy.id, name: u.pharmacy.name, outletType: u.pharmacy.outletType, state: u.pharmacy.state, lga: u.pharmacy.lga, acceptsOrders: u.pharmacy.acceptsOrders },
});

authRoutes.post(
  "/register",
  ah(async (req, res) => {
    const input = parse(registerSchema, req.body);
    if (await db.user.findUnique({ where: { phone: input.phone } }))
      throw new HttpError(409, "An account with this phone number already exists");
    const pharmacy = await db.pharmacy.create({
      data: {
        name: input.pharmacyName,
        outletType: input.outletType,
        state: input.state,
        lga: input.lga,
        users: {
          create: { name: input.name, phone: input.phone, role: "OWNER", passwordHash: await bcrypt.hash(input.password, 10) },
        },
      },
      include: { users: true },
    });
    const u = pharmacy.users[0];
    res.status(201).json({ token: sign({ id: u.id, pharmacyId: pharmacy.id, role: u.role }), ...session({ ...u, pharmacy }) });
  }),
);

authRoutes.post(
  "/login",
  ah(async (req, res) => {
    const input = parse(loginSchema, req.body);
    const u = await db.user.findUnique({ where: { phone: input.phone }, include: { pharmacy: true } });
    if (!u || !(await bcrypt.compare(input.password, u.passwordHash)))
      throw new HttpError(401, "Phone number or password is incorrect");
    res.json({ token: sign({ id: u.id, pharmacyId: u.pharmacyId, role: u.role }), ...session(u) });
  }),
);

authRoutes.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    const u = await db.user.findUniqueOrThrow({ where: { id: me(req).id }, include: { pharmacy: true } });
    res.json(session(u));
  }),
);

authRoutes.patch(
  "/settings",
  requireAuth,
  ah(async (req, res) => {
    const u = me(req);
    if (u.role !== "OWNER") throw new HttpError(403, "Only the pharmacy owner can change these details");
    const input = parse(settingsSchema, req.body);
    const updated = await db.$transaction(async (tx) => {
      await tx.pharmacy.update({
        where: { id: u.pharmacyId },
        data: { name: input.pharmacyName, outletType: input.outletType, state: input.state, lga: input.lga, acceptsOrders: input.acceptsOrders },
      });
      return tx.user.update({ where: { id: u.id }, data: { name: input.name }, include: { pharmacy: true } });
    });
    res.json(session(updated));
  }),
);
