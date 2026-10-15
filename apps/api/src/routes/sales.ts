import { Router } from "express";
import { saleSchema } from "@magani/shared";
import { db } from "../db";
import { me } from "../auth";
import { ah, parse } from "../http";
import { recordSale } from "../services/inventory";

export const saleRoutes = Router();

saleRoutes.post(
  "/",
  ah(async (req, res) => {
    const u = me(req);
    const input = parse(saleSchema, req.body);
    const { sale, warnings } = await db.$transaction((tx) => recordSale(tx, u.pharmacyId, u.id, input));
    res.status(201).json({ sale, warnings });
  }),
);

saleRoutes.get(
  "/",
  ah(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86_400_000);
    res.json(
      await db.sale.findMany({
        where: { pharmacyId: me(req).pharmacyId, soldAt: { gte: from } },
        include: { items: { include: { product: { select: { name: true } } } }, patient: { select: { name: true } } },
        orderBy: { soldAt: "desc" },
        take: 200,
      }),
    );
  }),
);
