import express, { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { env } from "../env";
import { ah, HttpError } from "../http";
import type { MaganiOrder } from "../magani";
import { syncOrder } from "../orders";

export const webhookRoutes = Router();

/** Magani calls this when a pharmacy accepts, prepares, dispenses or declines one of our orders. */
webhookRoutes.post(
  "/magani",
  express.raw({ type: "application/json" }),
  ah(async (req, res) => {
    if (!env.MAGANI_WEBHOOK_SECRET) throw new HttpError(503, "Webhook secret not configured");
    const body = req.body as Buffer;
    const expected = createHmac("sha256", env.MAGANI_WEBHOOK_SECRET).update(body).digest();
    const given = Buffer.from(String(req.headers["x-magani-signature"] ?? ""), "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new HttpError(401, "Bad signature");

    const { order } = JSON.parse(body.toString("utf8")) as { event: string; order: MaganiOrder };
    const local = await db.medicineOrder.findUnique({ where: { id: order.externalRef } });
    if (local) await syncOrder(local.id, order);
    res.json({ ok: true });
  }),
);
