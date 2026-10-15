import { Router } from "express";
import { productSchema, receiveSchema, adjustSchema } from "@magani/shared";
import { db } from "../db";
import { me } from "../auth";
import { ah, HttpError, parse } from "../http";
import { receiveStock } from "../services/inventory";
import { stockView } from "../services/stockview";

export const productRoutes = Router();

productRoutes.get("/", ah(async (req, res) => res.json(await stockView(me(req).pharmacyId))));

productRoutes.post(
  "/",
  ah(async (req, res) => {
    const input = parse(productSchema, req.body);
    res.status(201).json(await db.product.create({ data: { ...input, pharmacyId: me(req).pharmacyId } }));
  }),
);

productRoutes.patch(
  "/:id",
  ah(async (req, res) => {
    const input = parse(productSchema.partial(), req.body);
    const { count } = await db.product.updateMany({ where: { id: req.params.id, pharmacyId: me(req).pharmacyId }, data: input });
    if (!count) throw new HttpError(404, "Product not found");
    res.json({ ok: true });
  }),
);

productRoutes.get(
  "/:id/batches",
  ah(async (req, res) => {
    res.json(
      await db.batch.findMany({
        where: { productId: req.params.id, product: { pharmacyId: me(req).pharmacyId } },
        orderBy: { expiry: "asc" },
      }),
    );
  }),
);

export const stockRoutes = Router();

stockRoutes.post(
  "/receive",
  ah(async (req, res) => {
    const u = me(req);
    const input = parse(receiveSchema, req.body);
    res.status(201).json(await db.$transaction((tx) => receiveStock(tx, u.pharmacyId, u.id, input)));
  }),
);

stockRoutes.post(
  "/adjust",
  ah(async (req, res) => {
    const u = me(req);
    const input = parse(adjustSchema, req.body);
    const out = await db.$transaction(async (tx) => {
      const batch = await tx.batch.findFirst({ where: { id: input.batchId, product: { pharmacyId: u.pharmacyId } } });
      if (!batch) throw new HttpError(404, "Batch not found");
      if (batch.quantity + input.quantity < 0) throw new HttpError(409, `This batch only has ${batch.quantity} left`);
      await tx.stockMovement.create({
        data: {
          pharmacyId: u.pharmacyId,
          productId: batch.productId,
          batchId: batch.id,
          type: "ADJUST",
          quantity: input.quantity,
          note: input.reason,
          userId: u.id,
        },
      });
      return tx.batch.update({ where: { id: batch.id }, data: { quantity: { increment: input.quantity } } });
    });
    res.json(out);
  }),
);

stockRoutes.get(
  "/expiring",
  ah(async (req, res) => {
    const days = Number(req.query.days ?? 90);
    res.json(
      await db.batch.findMany({
        where: {
          quantity: { gt: 0 },
          expiry: { lte: new Date(Date.now() + days * 86_400_000) },
          product: { pharmacyId: me(req).pharmacyId },
        },
        include: { product: { select: { name: true, strength: true } } },
        orderBy: { expiry: "asc" },
      }),
    );
  }),
);
