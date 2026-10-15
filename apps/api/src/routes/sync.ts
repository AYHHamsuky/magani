import { Router } from "express";
import { syncPushSchema } from "@magani/shared";
import { db } from "../db";
import { me } from "../auth";
import { ah, HttpError, parse } from "../http";
import { receiveStock, recordSale } from "../services/inventory";
import { stockView } from "../services/stockview";

export const syncRoutes = Router();

type Result = { id: string; status: "applied" | "duplicate" | "failed"; warnings?: string[]; error?: string };

/**
 * Offline outbox from the mobile app. Every op carries a client-generated UUID,
 * so replays are idempotent: an op already applied returns "duplicate".
 */
syncRoutes.post(
  "/push",
  ah(async (req, res) => {
    const u = me(req);
    const { ops } = parse(syncPushSchema, req.body);
    const results: Result[] = [];

    for (const op of ops) {
      const id = op.payload.id;
      try {
        if (op.type === "sale") {
          if (await db.sale.findUnique({ where: { id } })) {
            results.push({ id, status: "duplicate" });
            continue;
          }
          const { warnings } = await db.$transaction((tx) => recordSale(tx, u.pharmacyId, u.id, op.payload, true));
          results.push({ id, status: "applied", warnings });
        } else {
          if (await db.stockMovement.findUnique({ where: { id } })) {
            results.push({ id, status: "duplicate" });
            continue;
          }
          await db.$transaction((tx) => receiveStock(tx, u.pharmacyId, u.id, op.payload));
          results.push({ id, status: "applied" });
        }
      } catch (e) {
        results.push({ id, status: "failed", error: e instanceof HttpError ? e.message : "Server error" });
      }
    }
    res.json({ results });
  }),
);

/** Snapshot for the device cache. Pharmacies are small enough for a full pull. */
syncRoutes.get(
  "/pull",
  ah(async (req, res) => {
    const { pharmacyId } = me(req);
    const [products, patients] = await Promise.all([
      stockView(pharmacyId),
      db.patient.findMany({
        where: { pharmacyId },
        include: { refillPlans: { where: { active: true }, include: { product: { select: { name: true, priceKobo: true } } } } },
        orderBy: { name: "asc" },
      }),
    ]);
    res.json({ products, patients, pulledAt: new Date().toISOString() });
  }),
);
